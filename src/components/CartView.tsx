import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, Banknote, CreditCard, Loader2, Utensils, AlertCircle, Lock } from 'lucide-react';
import type { MenuItem, TableSessionInfo, ActiveOrder } from '../services/qrOrderService';

interface CartItem extends MenuItem {
  qty: number;
  itemNote?: string;
}

interface CartViewProps {
  onBackToMenu: () => void;
  cart: Record<string, CartItem>;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  tableNumber?: string;
  isAppendingToTab: boolean;
  activeOrder?: ActiveOrder | null;
  onSubmitOrder: (formData: {
    customerName: string;
    customerPhone: string;
    customerNote: string;
    paymentMethod: string;
  }) => Promise<void>;
  submitting: boolean;
  onlinePaymentEnabled?: boolean;
  tableInfo?: TableSessionInfo | null;
}

export const CartView: React.FC<CartViewProps> = ({
  onBackToMenu,
  cart,
  onUpdateQty,
  onRemoveItem,
  tableNumber,
  isAppendingToTab,
  activeOrder,
  onSubmitOrder,
  submitting,
  onlinePaymentEnabled = false,
  tableInfo,
}) => {
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('qr_customer_name') || '';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    return localStorage.getItem('qr_customer_phone') || '';
  });
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [validationError, setValidationError] = useState('');

  const items = Object.values(cart).filter((i) => i.qty > 0);
  const rawSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const taxEnabled = Boolean(tableInfo?.taxEnabled);
  const pricesIncludeTax = Boolean(tableInfo?.pricesIncludeTax);
  const defaultTaxRate = Number(tableInfo?.taxRate ?? 0);
  const taxLabel = tableInfo?.taxLabelGlobal || 'GST';
  const taxSplitEnabled = tableInfo?.taxSplitEnabled !== false;
  const currency = tableInfo?.currencySymbol || '₹';

  let computedNetSubtotal = 0;
  let computedTaxTotal = 0;
  let computedTotalPayable = 0;

  items.forEach((item) => {
    const isPackaged = Boolean(
      item.isPackagedGood ||
      (item as any).is_packaged_good ||
      (item as any).isPackaged ||
      (item as any).is_packaged
    );
    const itemPricesIncludeTax = pricesIncludeTax || isPackaged;

    const lineRate = (item.taxRate !== undefined && item.taxRate !== null && Number(item.taxRate) > 0)
      ? Number(item.taxRate)
      : (taxEnabled ? defaultTaxRate : 0);
    const lineGross = item.price * item.qty;

    if (!taxEnabled || lineRate <= 0) {
      computedNetSubtotal += lineGross;
      computedTotalPayable += lineGross;
    } else if (itemPricesIncludeTax) {
      // Inclusive pricing: menu price already includes tax (Packaged goods are always inclusive)
      const base = lineGross / (1 + lineRate / 100);
      const tax = lineGross - base;
      computedNetSubtotal += base;
      computedTaxTotal += tax;
      computedTotalPayable += lineGross;
    } else {
      // Exclusive pricing: tax is added on top of menu price
      const tax = lineGross * (lineRate / 100);
      computedNetSubtotal += lineGross;
      computedTaxTotal += tax;
      computedTotalPayable += lineGross + tax;
    }
  });

  const effectiveTaxRate = computedNetSubtotal > 0
    ? Math.round(((computedTaxTotal / computedNetSubtotal) * 100) * 10) / 10
    : defaultTaxRate;

  const hasInclusiveItems = pricesIncludeTax || items.some(item => 
    Boolean(item.isPackagedGood || (item as any).is_packaged_good || (item as any).isPackaged || (item as any).is_packaged)
  );

  const totalAmount = computedTotalPayable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (customerName) localStorage.setItem('qr_customer_name', customerName);
    if (customerPhone) localStorage.setItem('qr_customer_phone', customerPhone);

    try {
      setValidationError('');
      await onSubmitOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNote: customerNote.trim(),
        paymentMethod,
      });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to place order. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white animate-in fade-in duration-200">
      {/* Screen 3 Top Bar: ← Your Order */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            disabled={submitting}
            className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition active:scale-95 disabled:opacity-50"
            aria-label="Back to menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-black text-slate-900 text-base leading-tight">
              Your Order
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Review & place your dishes</p>
          </div>
        </div>

        <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200/80 font-bold px-2.5 py-1 rounded-xl shadow-2xs">
          Table #{tableNumber}
        </span>
      </div>

      {/* Main Order Content */}
      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4">
        {/* If editing an active live order */}
        {isAppendingToTab && activeOrder && (
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>Editing Live Order #{activeOrder.orderNo || activeOrder.id?.slice(0, 8)}</span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-bold">Edit / Append</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Dishes previously ordered ({activeOrder.lines?.length || 0} item{activeOrder.lines?.length === 1 ? '' : 's'}, ₹{Number(activeOrder.grandTotal || activeOrder.totalAmount || 0).toFixed(0)}) cannot be removed. Any new items added below will update and append to your table bill.
              </p>
            </div>
          </div>
        )}

        {/* Order Items List with Thumbnails */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {isAppendingToTab ? 'New Dishes to Add' : 'Selected Dishes'} ({items.reduce((sum, i) => sum + i.qty, 0)})
            </h3>
            {items.length > 0 && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="text-xs font-extrabold text-orange-600 hover:text-orange-700"
              >
                + Add More
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-6">
              <Utensils className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Your order is empty</p>
              <p className="text-xs text-slate-400 mt-1">Please select some dishes from the menu.</p>
              <button
                type="button"
                onClick={onBackToMenu}
                className="mt-4 bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-slate-50/60 rounded-2xl p-3 border border-slate-100">
              {items.map((item) => {
                const imgUrl = item.imageUrl || item.image;
                const itemTotal = item.price * item.qty;
                const maxStock = item.currentStock !== undefined && item.currentStock !== null ? Number(item.currentStock) : null;
                const isStockMaxed = maxStock !== null && item.qty >= maxStock;

                return (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Utensils className="w-4 h-4 text-orange-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                          {item.name}
                        </h4>
                        {item.itemNote && (
                          <p className="text-[10px] text-orange-600 font-medium truncate">
                            Note: {item.itemNote}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-black text-slate-900">
                            {currency}{itemTotal.toFixed(itemTotal % 1 === 0 ? 0 : 2)}
                          </span>
                          {(item.isPackagedGood || (item as any).is_packaged_good || (item as any).isPackaged) && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 uppercase tracking-tight">
                              Incl. Tax
                            </span>
                          )}
                          {maxStock !== null && isStockMaxed && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Max stock ({maxStock})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stepper (Orange Pill matching reference Screen 3) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-orange-600 text-white rounded-xl px-2 py-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="p-0.5 hover:bg-orange-700 rounded transition active:scale-90 cursor-pointer"
                          aria-label="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-extrabold text-xs">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, 1)}
                          disabled={isStockMaxed}
                          className={`p-0.5 rounded transition ${
                            isStockMaxed
                              ? 'opacity-35 cursor-not-allowed text-orange-200'
                              : 'hover:bg-orange-700 active:scale-90 cursor-pointer'
                          }`}
                          aria-label="Increase"
                          title={isStockMaxed ? `Only ${maxStock} in stock` : undefined}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <>
            {/* Special Instructions (Catatan Tambahan) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-900 mb-1">
                Special Instructions for Kitchen (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, gravy separated, extra cutlery..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400"
                maxLength={150}
              />
            </div>

            {/* Customer Details */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-900">
                  Your Details (Optional)
                </label>
                {tableInfo?.loyaltyEnabled && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1">
                    ✨ Earn Loyalty Points
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              {tableInfo?.loyaltyEnabled && !customerPhone && (
                <p className="text-[10px] text-slate-400 italic">
                  Enter your phone number to earn reward points for this order.
                </p>
              )}
            </div>

            {/* Payment Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Payment Summary
              </h3>
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-100">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-700">
                    {currency}{rawSubtotal.toFixed(rawSubtotal % 1 === 0 ? 0 : 2)}
                  </span>
                </div>

                {taxEnabled && computedTaxTotal > 0 ? (
                  taxSplitEnabled && taxLabel.toUpperCase() === 'GST' ? (
                    <>
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span>CGST ({(effectiveTaxRate / 2).toFixed(1)}%{hasInclusiveItems ? ' incl.' : ''})</span>
                        <span className="font-semibold text-slate-700">
                          {currency}{(computedTaxTotal / 2).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span>SGST ({(effectiveTaxRate / 2).toFixed(1)}%{hasInclusiveItems ? ' incl.' : ''})</span>
                        <span className="font-semibold text-slate-700">
                          {currency}{(computedTaxTotal / 2).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>
                        {taxLabel} ({effectiveTaxRate}%{hasInclusiveItems ? ' incl.' : ''})
                      </span>
                      <span className="font-semibold text-slate-700">
                        {currency}{computedTaxTotal.toFixed(2)}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span>{taxLabel || 'Taxes & GST'}</span>
                    <span className="text-slate-400 font-medium">{currency}0.00</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center font-black text-sm text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-base font-black text-orange-600">
                    {currency}{totalAmount.toFixed(totalAmount % 1 === 0 ? 0 : 2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Payment Method
              </h3>
              <div className="space-y-2">
                {/* Pay at Counter (Only allowed payment method) */}
                <label 
                  onClick={() => setPaymentMethod('CASH')}
                  className="p-3 rounded-2xl border border-orange-500 bg-orange-50/50 text-slate-900 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-slate-700 flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-black text-xs">Pay at Counter (Cash / Card)</div>
                      <div className="text-[10px] text-slate-400">Pay directly when finished dining</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="accent-orange-600 w-4 h-4"
                  />
                </label>

                {/* Pay Online (Disabled as of now) */}
                {onlinePaymentEnabled && (
                  <div 
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/80 opacity-60 flex items-center justify-between cursor-not-allowed select-none transition"
                    title="Online payment is currently disabled. Please pay at counter."
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/80 text-slate-400 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-xs text-slate-500">Pay Online (UPI / Card / NetBanking)</div>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                            Disabled
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">Currently unavailable • Pay at counter</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      disabled
                      checked={false}
                      className="accent-orange-600 w-4 h-4 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            </div>

            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Bottom Button */}
            <div className="pt-2 pb-6">
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:pointer-events-none text-sm tracking-wide"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Order to Kitchen...
                  </>
                ) : (
                  <span>
                    {isAppendingToTab ? 'Update Order (+ Add Dishes)' : 'Confirm & Place Order'} • {currency}{totalAmount.toFixed(totalAmount % 1 === 0 ? 0 : 2)}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default CartView;
