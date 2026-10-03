import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Layers, Utensils } from 'lucide-react';
import type { MenuItem } from '../services/qrOrderService';

export interface VariantOptionItem {
  id: string;
  name: string;
  price: number;
  groupName?: string;
  outOfStock?: boolean;
  currentStock?: number | null;
}

export interface SelectedVariantWithQty {
  variant: VariantOptionItem;
  qty: number;
}

interface ItemDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    qty: number,
    note?: string,
    variant?: VariantOptionItem,
    selectedVariants?: SelectedVariantWithQty[]
  ) => void;
  initialQty?: number;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  initialQty = 1,
}) => {
  if (!isOpen || !item) return null;

  const [imageError, setImageError] = useState(false);

  // Available variants: either from backend item.variants, or smart intelligent variants
  const variants = useMemo<VariantOptionItem[]>(() => {
    if (item.variants && item.variants.length > 0) {
      return item.variants;
    }
    const basePrice = Number(item.price || 0);
    const lowerName = (item.name || '').toLowerCase();

    if (lowerName.includes('dosa')) {
      return [
        { id: 'plain', name: 'Plain Dosa', price: basePrice, groupName: 'Dosa Options' },
        { id: 'kutti', name: 'Kutti Dosa', price: Math.max(1, Math.round(basePrice * 0.8)), groupName: 'Dosa Options' },
        { id: 'beetroot', name: 'Beetroot Dosa', price: Math.round(basePrice * 1.15), groupName: 'Dosa Options' },
        { id: 'masala', name: 'Masala Dosa', price: Math.round(basePrice * 1.25), groupName: 'Dosa Options' },
      ];
    }

    if (lowerName.includes('mandhi') || lowerName.includes('biryani') || lowerName.includes('rice')) {
      return [
        { id: 'quarter', name: 'Quarter (1 Pc)', price: Math.max(1, Math.round(basePrice * 0.6)), groupName: 'Portion' },
        { id: 'half', name: 'Half (2 Pcs)', price: basePrice, groupName: 'Portion' },
        { id: 'full', name: 'Full (4 Pcs)', price: Math.round(basePrice * 1.8), groupName: 'Portion' },
      ];
    }

    return [
      { id: 'regular', name: 'Regular', price: basePrice, groupName: 'Options' },
      { id: 'half', name: 'Half Portion', price: Math.max(1, Math.round(basePrice * 0.65)), groupName: 'Options' },
      { id: 'full', name: 'Full / Large', price: Math.round(basePrice * 1.35), groupName: 'Options' },
    ];
  }, [item]);

  // Per-variant dynamic quantities state: { [variantId]: qty }
  const [variantQtys, setVariantQtys] = useState<Record<string, number>>({});

  // Initialize with 1 for the first in-stock variant when opened
  useEffect(() => {
    if (variants.length > 0) {
      const firstAvailable = variants.find((v) => !v.outOfStock);
      if (firstAvailable) {
        setVariantQtys({ [firstAvailable.id]: initialQty > 0 ? initialQty : 1 });
      } else {
        setVariantQtys({});
      }
    } else {
      setVariantQtys({});
    }
    setImageError(false);
  }, [item, variants, initialQty]);

  // Dynamic quantity handler for a specific variant
  const handleUpdateVariantQty = (variantId: string, delta: number) => {
    const target = variants.find((v) => v.id === variantId);
    if (target?.outOfStock && delta > 0) return;

    setVariantQtys((prev) => {
      const current = prev[variantId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[variantId];
        return copy;
      }
      return { ...prev, [variantId]: next };
    });
  };

  const isVeg = item.isVegetarian || item.dietary === 'VEG';
  const imgUrl = item.imageUrl || item.image;
  const hasImage = Boolean(imgUrl && !imageError);

  // Dynamic calculations: total price, count, and selected items list
  const { totalPrice, totalCount, selectedList } = useMemo(() => {
    let priceSum = 0;
    let countSum = 0;
    const list: SelectedVariantWithQty[] = [];

    variants.forEach((v) => {
      const q = variantQtys[v.id] || 0;
      if (q > 0) {
        priceSum += v.price * q;
        countSum += q;
        list.push({ variant: v, qty: q });
      }
    });

    return { totalPrice: priceSum, totalCount: countSum, selectedList: list };
  }, [variants, variantQtys]);

  const handleAdd = () => {
    if (selectedList.length === 0) return;
    onAddToCart(item, totalCount, undefined, undefined, selectedList);
    onClose();
  };

  const groupLabel = variants[0]?.groupName || 'Options / Variants';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150 p-0 sm:p-4">
      {/* Super Compact Popup Sheet */}
      <div className="bg-white w-full max-w-[350px] mx-auto rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 border border-slate-100 max-h-[78vh]">
        
        {/* Compact Top Image Banner */}
        <div className="relative bg-slate-100 shrink-0">
          {hasImage ? (
            <div className="h-24 sm:h-28 w-full overflow-hidden relative">
              <img
                src={imgUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
            </div>
          ) : (
            <div className="h-16 w-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white/60" />
            </div>
          )}

          {/* Close Button on Banner */}
          <button
            onClick={onClose}
            className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition active:scale-95 backdrop-blur-xs shadow-xs cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Details & Customization Body */}
        <div className="p-3 space-y-2 overflow-y-auto">
          {/* Dish Header Info & Direct Description */}
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`w-3 h-3 border rounded-xs flex items-center justify-center shrink-0 ${
                  isVeg ? 'border-emerald-600' : 'border-rose-600'
                }`}
                title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
              </span>
              {item.category && (
                <span className="text-[9px] font-extrabold text-orange-600 uppercase tracking-wider">
                  {item.category}
                </span>
              )}
              {(item.isPackagedGood || (item as any).is_packaged_good || (item as any).isPackaged) && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 uppercase tracking-tight ml-auto">
                  Incl. Tax
                </span>
              )}
            </div>

            <h2 className="text-sm font-black text-slate-900 leading-tight">
              {item.name}
            </h2>

            {/* Direct plain text description */}
            {item.description && (
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          {/* Dynamic Variant List with Individual Quantity Controls */}
          {variants.length > 0 && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-orange-500" />
                  {groupLabel}
                </label>
                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                  Select Quantities
                </span>
              </div>

              {/* Dynamic Option Cards */}
              <div className="space-y-1.5">
                {variants.map((v) => {
                  const qty = variantQtys[v.id] || 0;
                  const isSelected = qty > 0;
                  const isOutOfStock = Boolean(v.outOfStock);

                  return (
                    <div
                      key={v.id}
                      onClick={() => !isOutOfStock && handleUpdateVariantQty(v.id, 1)}
                      className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-all duration-200 select-none ${
                        isOutOfStock
                          ? 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-orange-300/80 bg-orange-50/20 shadow-2xs cursor-pointer active:scale-[0.99]'
                          : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200 cursor-pointer active:scale-[0.99]'
                      }`}
                    >
                      {/* Left: Variant Name & Price */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs ${isOutOfStock ? 'text-slate-400 line-through' : isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {v.name}
                          </span>
                          {isOutOfStock && (
                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 mt-0.5">
                          ₹{v.price.toFixed(0)}
                          {qty > 1 && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              • ₹{(v.price * qty).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Dynamic Quantity Stepper or Add button */}
                      <div 
                        className="shrink-0 flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isOutOfStock ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.8 rounded-md">
                            Unavailable
                          </span>
                        ) : isSelected ? (
                          <div className="flex items-center bg-white border border-orange-200/80 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateVariantQty(v.id, -1)}
                              className="w-5 h-5 rounded hover:bg-orange-50 text-orange-600 flex items-center justify-center transition active:scale-90 cursor-pointer"
                              aria-label="Decrease"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-xs text-orange-950">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateVariantQty(v.id, 1)}
                              className="w-5 h-5 rounded hover:bg-orange-50 text-orange-600 flex items-center justify-center transition active:scale-90 cursor-pointer"
                              aria-label="Increase"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateVariantQty(v.id, 1)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: Clean Total & Add to Order Button (No duplicate full qty stepper) */}
        <div className="p-2.5 px-3.5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs">
            <span className="text-slate-400 font-medium">Total: </span>
            <span className="font-black text-slate-900 text-sm">₹{totalPrice.toFixed(0)}</span>
            {totalCount > 0 && (
              <span className="text-[10px] text-slate-500 ml-1">({totalCount} items)</span>
            )}
          </div>

          {/* Small Add to Order Button */}
          <button
            onClick={handleAdd}
            disabled={totalCount === 0}
            className="w-auto bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-extrabold py-1.5 px-3.5 rounded-xl shadow-sm shadow-orange-600/25 transition flex items-center gap-1.5 active:scale-98 text-xs cursor-pointer disabled:pointer-events-none"
          >
            <span>Add to Order</span>
            <span className="bg-orange-800/60 px-1 py-0.2 rounded text-[10px] font-black">
              ₹{totalPrice.toFixed(0)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
