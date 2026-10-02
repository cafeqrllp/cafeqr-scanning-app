import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, UtensilsCrossed, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import qrOrderService, {
  type TableSessionInfo,
  type MenuItem,
  type ActiveOrder,
  type CustomerAuth,
} from './services/qrOrderService';
import TableBanner from './components/TableBanner';
import ActiveTabDrawer from './components/ActiveTabDrawer';
import MenuItemCard, { checkHasVariants } from './components/MenuItemCard';
import ItemDetailModal from './components/ItemDetailModal';
import CartView from './components/CartView';
import OrderSuccessModal from './components/OrderSuccessModal';
import ManualTableEntry from './components/ManualTableEntry';
import CustomerLoginModal from './components/CustomerLoginModal';
import LiveOrderBanner from './components/LiveOrderBanner';

interface CartItem extends MenuItem {
  qty: number;
  itemNote?: string;
  rawProductId?: string;
  variantId?: string;
  variantName?: string;
}

export function App() {
  // ── 1. Route / URL Resolution ──────────────────────────────
  const [routeParams, setRouteParams] = useState<{
    clientId: string;
    orgId: string;
    tableId: string;
  }>(() => {
    if (typeof window === 'undefined') return { clientId: '', orgId: '', tableId: '' };

    // 1. Check query parameters: ?clientId=...&orgId=...&tableId=...
    const urlParams = new URLSearchParams(window.location.search);
    const qClient = urlParams.get('clientId');
    const qOrg = urlParams.get('orgId') || 'null';
    const qTable = urlParams.get('tableId');
    if (qClient && qTable) {
      return { clientId: qClient, orgId: qOrg, tableId: qTable };
    }

    // 2. Check path: /menu/:clientId/:orgId/:tableId or /:clientId/:orgId/:tableId
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const parts = pathname.split('/');
    if (parts[0] === 'menu' && parts.length >= 4) {
      return { clientId: parts[1], orgId: parts[2], tableId: parts[3] };
    } else if (parts.length === 3 && parts[0] !== 'menu') {
      return { clientId: parts[0], orgId: parts[1], tableId: parts[2] };
    }

    // 3. Fallback to localStorage saved session if any
    const saved = localStorage.getItem('last_qr_table_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }

    return { clientId: '', orgId: '', tableId: '' };
  });

  // ── 2. Data State ──────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<TableSessionInfo | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  // ── 3. Cart & Modal State ──────────────────────────────────
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [currentView, setCurrentView] = useState<'menu' | 'cart'>('menu');
  const [isActiveTabOpen, setIsActiveTabOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItem | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  // Customer Authentication state (persisted in localStorage)
  const [customer, setCustomer] = useState<CustomerAuth | null>(() => {
    try {
      const saved = localStorage.getItem('qr_customer_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── 4. Load Table Session & Menu Data ──────────────────────
  const loadData = useCallback(async (cId: string, oId: string, tId: string) => {
    if (!cId || !tId) return;
    setLoading(true);
    setError(null);

    try {
      const session = await qrOrderService.fetchTableSession(cId, oId, tId);
      if (session && session.found) {
        setTableInfo(session);
        setActiveOrder(session.activeOrder || null);
        localStorage.setItem(
          'last_qr_table_session',
          JSON.stringify({ clientId: cId, orgId: oId, tableId: tId })
        );
      } else {
        setError(session?.error || 'Invalid Table QR Code or table not found.');
        setTableInfo(null);
        setActiveOrder(null);
        setLoading(false);
        return;
      }

      const menuData = await qrOrderService.fetchMenu(cId, oId);
      const filteredMenu = menuData.filter(
        (item) => !item.isIngredient && item.productType?.toUpperCase() !== 'INGREDIENT'
      );
      setMenu(filteredMenu);

      const cats = Array.from(new Set(filteredMenu.map((item) => item.category || 'General').filter(Boolean)));
      setCategories(['All', ...cats]);
    } catch (err: any) {
      console.error('Failed to load table session', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(serverMsg || 'Unable to connect to restaurant server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 4b. Real-Time Table & Active Order Sync ─────────────────
  const syncTableSession = useCallback(async (cId: string, oId: string, tId: string) => {
    if (!cId || !tId) return;
    try {
      const session = await qrOrderService.fetchTableSession(cId, oId, tId);
      if (session && session.found) {
        setTableInfo((prev) => (prev ? { ...prev, ...session } : session));
        const newActiveOrder = session.activeOrder || null;

        setActiveOrder((prevActiveOrder) => {
          // If active order was settled or cleared by the restaurant
          if (!newActiveOrder) {
            if (prevActiveOrder !== null) {
              setIsActiveTabOpen(false); // Close bill drawer if open
            }
            return null;
          }

          // If active order exists, update whenever ANY detail from restaurant changes
          // (items added/removed, quantities, discounts, prices, status, kitchen note, etc.)
          if (!prevActiveOrder || JSON.stringify(prevActiveOrder) !== JSON.stringify(newActiveOrder)) {
            return newActiveOrder;
          }

          return prevActiveOrder;
        });
      }
    } catch (err) {
      // Non-blocking background sync heartbeat
      console.warn('Real-time table sync heartbeat blip', err);
    }
  }, []);

  // Poll for real-time table & order changes every 2.5 seconds (and immediately on tab focus)
  useEffect(() => {
    const { clientId, orgId, tableId } = routeParams;
    if (!clientId || !tableId) return;

    let isPolling = false;
    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isPolling) return;
      isPolling = true;
      try {
        await syncTableSession(clientId, orgId, tableId);
      } finally {
        isPolling = false;
      }
    };

    // Fast 2.5s heartbeat for real-time UI updates
    const intervalId = setInterval(poll, 2500);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        poll();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityOrFocus);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleVisibilityOrFocus);
      }
    };
  }, [routeParams, syncTableSession]);

  useEffect(() => {
    if (routeParams.clientId && routeParams.tableId) {
      loadData(routeParams.clientId, routeParams.orgId, routeParams.tableId);
    }
  }, [routeParams, loadData]);

  // Prompt login screen on first scan if not already logged in
  useEffect(() => {
    if (tableInfo && !customer) {
      setShowAuthModal(true);
    }
  }, [tableInfo, customer]);

  // ── 5. Cart Operations ─────────────────────────────────────
  const handleAddToCart = (
    item: MenuItem,
    qtyDelta = 1,
    itemNote?: string,
    variant?: { id: string; name: string; price: number; outOfStock?: boolean },
    selectedVariants?: any
  ) => {
    // Guard against adding out-of-stock items
    if (item.outOfStock && !variant && (!selectedVariants || selectedVariants.length === 0)) {
      return;
    }

    setCart((prev) => {
      let nextCart = { ...prev };

      // Case 1: Array of { variant, qty } where each variant has its own quantity
      if (Array.isArray(selectedVariants) && selectedVariants.length > 0 && selectedVariants[0].variant) {
        selectedVariants.forEach((entry: { variant: { id: string; name: string; price: number; outOfStock?: boolean }; qty: number }) => {
          const v = entry.variant;
          if (v.outOfStock) return;
          const vQty = entry.qty || 1;
          const cartItemId = `${item.id}-${v.id}`;
          const current = nextCart[cartItemId];
          const newQty = current ? current.qty + vQty : vQty;
          const finalName = `${item.name} (${v.name})`;

          nextCart[cartItemId] = {
            ...item,
            id: cartItemId,
            rawProductId: item.id,
            variantId: v.id,
            variantName: finalName,
            name: finalName,
            price: v.price,
            qty: newQty,
            itemNote: itemNote !== undefined ? itemNote : current?.itemNote,
          };
        });
        return nextCart;
      }

      // Case 2: Array of variants (single combined item)
      if (Array.isArray(selectedVariants) && selectedVariants.length > 0) {
        const variantIds = selectedVariants.map((v: any) => v.id).sort().join('-');
        const cartItemId = `${item.id}-${variantIds}`;
        const finalPrice = selectedVariants.reduce((sum: number, v: any) => sum + v.price, 0);
        const variantNames = selectedVariants.map((v: any) => v.name).join(', ');
        const finalName = `${item.name} (${variantNames})`;
        const current = nextCart[cartItemId];
        const newQty = current ? current.qty + qtyDelta : qtyDelta;

        nextCart[cartItemId] = {
          ...item,
          id: cartItemId,
          rawProductId: item.id,
          variantId: selectedVariants[0]?.id,
          variantName: finalName,
          name: finalName,
          price: finalPrice,
          qty: newQty,
          itemNote: itemNote !== undefined ? itemNote : current?.itemNote,
        };
        return nextCart;
      }

      // Case 3: Single variant
      if (variant) {
        const cartItemId = `${item.id}-${variant.id}`;
        const current = nextCart[cartItemId];
        const newQty = current ? current.qty + qtyDelta : qtyDelta;
        const finalName = `${item.name} (${variant.name})`;

        nextCart[cartItemId] = {
          ...item,
          id: cartItemId,
          rawProductId: item.id,
          variantId: variant.id,
          variantName: finalName,
          name: finalName,
          price: variant.price,
          qty: newQty,
          itemNote: itemNote !== undefined ? itemNote : current?.itemNote,
        };
        return nextCart;
      }

      // Case 4: Standard non-variant product
      const current = nextCart[item.id];
      const newQty = current ? current.qty + qtyDelta : qtyDelta;
      nextCart[item.id] = {
        ...item,
        id: item.id,
        rawProductId: item.id,
        qty: newQty,
        itemNote: itemNote !== undefined ? itemNote : current?.itemNote,
      };
      return nextCart;
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          ...current,
          qty: newQty,
        },
      };
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Derived cart totals
  const cartItems = useMemo(() => Object.values(cart).filter((i) => i.qty > 0), [cart]);
  const cartTotalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );
  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );

  const specialPromos = useMemo(() => {
    return menu.slice(0, 4);
  }, [menu]);

  // ── 6. Order Submission ────────────────────────────────────
  const handleSubmitOrder = async (formData: {
    customerName: string;
    customerPhone: string;
    customerNote: string;
    paymentMethod: string;
  }) => {
    if (cartItems.length === 0 || !tableInfo) return;

    setSubmittingOrder(true);
    try {
      const payload = {
        tableId: tableInfo.tableId,
        tableNumber: tableInfo.tableNumber,
        customerId: customer?.id || localStorage.getItem('qr_customer_id') || undefined,
        customerName: customer?.name || formData.customerName || localStorage.getItem('qr_customer_name') || undefined,
        customerPhone: customer?.phone || formData.customerPhone || localStorage.getItem('qr_customer_phone') || undefined,
        customerEmail: customer?.email || localStorage.getItem('qr_customer_email') || undefined,
        customerNote: formData.customerNote,
        paymentMethod: formData.paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.rawProductId || item.id,
          variantId: item.variantId,
          quantity: item.qty,
          name: item.name,
          price: item.price,
          category: item.category,
        })),
      };

      const result = await qrOrderService.submitOrder(
        routeParams.clientId,
        routeParams.orgId,
        payload
      );

      setCart({});
      setCurrentView('menu');
      setOrderResult(result);

      await loadData(routeParams.clientId, routeParams.orgId, routeParams.tableId);
    } catch (err: any) {
      throw err;
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ── 7. Filtered Menu Items ─────────────────────────────────
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesCat =
        activeCategory === 'All' ||
        (item.category || 'General').toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [menu, activeCategory, search]);

  // ── 8. Render: No table selected (Manual table entry) ───────
  if (!routeParams.clientId || !routeParams.tableId) {
    return (
      <ManualTableEntry
        onSelectTable={(c, o, t) => {
          setRouteParams({ clientId: c, orgId: o, tableId: t });
        }}
        error={error || undefined}
      />
    );
  }

  // ── 9. Render: Loading ─────────────────────────────────────
  if (loading && !tableInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">Loading Menu...</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">Connecting to live table session</p>
      </div>
    );
  }

  // ── 10. Render: Error ──────────────────────────────────────
  if (error && !tableInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-lg border border-slate-100 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {error.toLowerCase().includes('subscription')
                ? 'Subscription Notice'
                : error.toLowerCase().includes('network') || error.toLowerCase().includes('connect')
                ? 'Connection Error'
                : 'Table Not Found'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => setRouteParams({ clientId: '', orgId: '', tableId: '' })}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition shadow-sm active:scale-95"
          >
            Scan Another Table
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('qr_customer_auth');
    localStorage.removeItem('qr_customer_name');
    localStorage.removeItem('qr_customer_phone');
    localStorage.removeItem('qr_customer_email');
    setCustomer(null);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 sm:py-6">
      {/* Mobile Phone Mockup Frame (Screen 1 & Screen 3) */}
      <div
        className={`max-w-md mx-auto min-h-screen sm:min-h-[92vh] sm:rounded-3xl bg-white shadow-xl border-x sm:border border-slate-200/80 flex flex-col relative overflow-x-hidden ${
          currentView === 'cart' ? 'pb-4' : 'pb-28'
        }`}
      >
        {currentView === 'cart' ? (
          /* Screen 3: In-page Order / Cart view (Pesanan Kamu) */
          <CartView
            onBackToMenu={() => setCurrentView('menu')}
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            tableNumber={tableInfo?.tableNumber}
            isAppendingToTab={Boolean(activeOrder)}
            activeOrder={activeOrder}
            onSubmitOrder={handleSubmitOrder}
            submitting={submittingOrder}
            onlinePaymentEnabled={tableInfo?.onlinePaymentEnabled}
            tableInfo={tableInfo}
          />
        ) : (
          <>
            {/* Top Restaurant & Table Bar */}
            {tableInfo && (
              <TableBanner
                tableInfo={tableInfo}
                cartItemCount={cartItemCount}
                customer={customer}
                onOpenAuth={() => setShowAuthModal(true)}
                onLogout={handleLogout}
                onOpenCart={() => {
                  setCurrentView('cart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            <div className="p-4 space-y-4 flex-1">
              {/* Live Order Banner (shown if an active order is present on the table) */}
              {activeOrder && (
                <LiveOrderBanner
                  activeOrder={activeOrder}
                  onViewOrder={() => setIsActiveTabOpen(true)}
                />
              )}

              {/* Search Input (Screen 1 Reference) */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="What would you like to eat today?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200/70 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition placeholder:text-slate-400 font-medium"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3. Special Promo / Highlights (Screen 1 Reference: Cek Promo Spesial Hari Ini!) */}
              {!search && activeCategory === 'All' && specialPromos.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        Special Highlights Today!
                      </h3>
                      <p className="text-[10px] text-slate-400">Customer favorites and chef recommendations</p>
                    </div>
                  </div>

                  {/* Horizontal Scroll of Promo Mini Cards */}
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                    {specialPromos.map((item) => {
                      const imgUrl = item.imageUrl || item.image;
                      const cartQty = cart[item.id]?.qty || 0;
                      const price = Number(item.price || 0);

                      const hasVar = checkHasVariants(item);
                      return (
                        <div
                          key={`promo-${item.id}`}
                          onClick={() => {
                            if (hasVar) {
                              setSelectedItemForDetail(item);
                            } else {
                              handleAddToCart(item);
                            }
                          }}
                          className={`w-32 shrink-0 bg-slate-50 rounded-2xl p-2 border shadow-xs flex flex-col justify-between cursor-pointer active:scale-98 transition group ${
                            cartQty > 0 ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-slate-200/70'
                          }`}
                        >
                          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-200 mb-1.5 relative">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <UtensilsCrossed className="w-5 h-5 text-orange-200" />
                              </div>
                            )}
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded backdrop-blur-xs">
                              ₹{price.toFixed(0)}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-[11px] leading-tight line-clamp-1">
                            {item.name}
                          </h4>

                          {cartQty > 0 ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1.5 flex items-center justify-between bg-orange-600 text-white rounded-lg px-2 py-1 shadow-xs"
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, -1)}
                                className="p-0.5 hover:bg-orange-700 rounded active:scale-90 font-bold"
                              >
                                -
                              </button>
                              <span className="font-black text-[10px]">{cartQty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(item)}
                                className="p-0.5 hover:bg-orange-700 rounded active:scale-90 font-bold"
                              >
                                +
                              </button>
                            </div>
                          ) : hasVar ? (
                            <span className="mt-1 text-[9px] text-orange-600 font-extrabold flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> Options
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Modern Category Carousel */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-2 sticky top-[0px] bg-white/95 backdrop-blur-md z-20 border-b border-slate-100 shadow-2xs">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 active:scale-95 shrink-0 border ${
                          isActive
                            ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/30'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* 5. 2-COLUMN GRID OF DISHES (Screen 1 Reference Bottom Grid) */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                  {filteredMenu.length === 0 ? (
                    <div className="col-span-2 bg-slate-50 rounded-2xl p-8 text-center text-slate-400 border border-slate-100">
                      <UtensilsCrossed className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">No dishes found</p>
                      <p className="text-xs text-slate-400 mt-1">Try another keyword or category.</p>
                    </div>
                  ) : (
                    filteredMenu.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        cartQty={cart[item.id]?.qty || 0}
                        onAddToCart={() => handleAddToCart(item)}
                        onRemoveFromCart={() => handleUpdateQty(item.id, -1)}
                        onOpenDetails={() => setSelectedItemForDetail(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 6. Floating Bottom Cart Bar (Transitions to Screen 3: Pesanan Kamu inside page) */}
            {cartItemCount > 0 && (
              <div className="fixed bottom-3 inset-x-0 px-4 z-40 max-w-md mx-auto pointer-events-none">
                <button
                  onClick={() => {
                    setCurrentView('cart');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-2xl p-3.5 shadow-xl shadow-orange-600/35 flex items-center justify-between font-extrabold text-xs sm:text-sm transition-all transform active:scale-98 pointer-events-auto cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-orange-800/80 text-white flex items-center justify-center text-[11px] font-extrabold shadow-inner">
                      {cartItemCount}
                    </span>
                    <span className="tracking-wide">View Order (Pesanan Kamu)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white">₹{cartTotalAmount.toFixed(0)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* Screen 2: Item Detail Modal */}
        <ItemDetailModal
          item={selectedItemForDetail}
          isOpen={Boolean(selectedItemForDetail)}
          onClose={() => setSelectedItemForDetail(null)}
          onAddToCart={(item, qty, note, variant, selectedVariants) =>
            handleAddToCart(item, qty, note, variant, selectedVariants)
          }
          initialQty={selectedItemForDetail ? cart[selectedItemForDetail.id]?.qty || 1 : 1}
        />

        {/* Active Tab Running Bill Drawer */}
        <ActiveTabDrawer
          isOpen={isActiveTabOpen}
          onClose={() => setIsActiveTabOpen(false)}
          onAddMore={() => {
            setIsActiveTabOpen(false);
            setCurrentView('menu');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          activeOrder={activeOrder}
          tableNumber={tableInfo?.tableNumber}
        />

        {/* Order Success Confirmation */}
        <OrderSuccessModal
          orderResult={orderResult}
          tableNumber={tableInfo?.tableNumber}
          onClose={() => setOrderResult(null)}
        />

        {/* Customer Login / Signup Screen on First Scan */}
        <CustomerLoginModal
          isOpen={showAuthModal}
          clientId={routeParams.clientId}
          orgId={routeParams.orgId}
          tableInfo={tableInfo}
          onLoginSuccess={(auth) => {
            setCustomer(auth);
            setShowAuthModal(false);
          }}
          onContinueAsGuest={() => {
            setShowAuthModal(false);
          }}
        />
      </div>
    </div>
  );
}

export default App;
