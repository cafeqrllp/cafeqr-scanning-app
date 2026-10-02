import React from 'react';
import { X, Clock, CheckCircle2, Receipt, Lock, PlusCircle } from 'lucide-react';
import type { ActiveOrder } from '../services/qrOrderService';

interface ActiveTabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder: ActiveOrder | null;
  tableNumber?: string;
  onAddMore?: () => void;
}

export const ActiveTabDrawer: React.FC<ActiveTabDrawerProps> = ({
  isOpen,
  onClose,
  activeOrder,
  tableNumber,
  onAddMore,
}) => {
  if (!isOpen || !activeOrder) return null;

  const orderLines = activeOrder.lines || [];
  const rawStatus = (activeOrder.orderStatus || 'ORDERED').toUpperCase();
  let statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
  let statusLabel = activeOrder.orderStatus || 'ORDERED';

  if (rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED' || rawStatus === 'SERVED') {
    statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    statusLabel = 'Served';
  } else if (rawStatus === 'PREPARING' || rawStatus === 'IN_PROGRESS' || rawStatus === 'COOKING') {
    statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
    statusLabel = 'Preparing';
  } else if (rawStatus === 'CONFIRMED' || rawStatus === 'ACCEPTED') {
    statusColor = 'bg-teal-50 text-teal-700 border-teal-200';
    statusLabel = 'Confirmed';
  } else if (rawStatus === 'READY') {
    statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    statusLabel = 'Ready to Serve';
  } else if (rawStatus === 'BILLED') {
    statusColor = 'bg-purple-50 text-purple-700 border-purple-200';
    statusLabel = 'Bill Issued';
  } else if (rawStatus === 'CANCELLED' || rawStatus === 'VOID') {
    statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusLabel = 'Cancelled';
  }

  const handleAddMore = () => {
    if (onAddMore) {
      onAddMore();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="bg-white w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Mobile handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Running Tab</h3>
              <p className="text-xs text-slate-500">Table #{tableNumber || activeOrder.tableNumber} • Order #{activeOrder.orderNo || activeOrder.id?.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Kitchen Status
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Locked items explanation note */}
        <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100/80 flex items-center gap-2 text-[11px] text-emerald-800">
          <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Already placed dishes cannot be removed. You can add more items below.</span>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-2">
          {orderLines.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No items found in active tab.</p>
          ) : (
            orderLines.map((line, idx) => (
              <div key={line.id || idx} className="pt-2.5 first:pt-0 flex items-center justify-between">
                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {line.quantity}×
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{line.productName}</h4>
                    {line.categoryName && (
                      <span className="text-[10px] text-slate-400 block">{line.categoryName}</span>
                    )}
                  </div>
                </div>
                <div className="text-right font-bold text-xs sm:text-sm text-slate-900 shrink-0">
                  ₹{Number(line.lineTotal || (line.unitPrice * line.quantity)).toFixed(0)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <div className="flex justify-between items-center text-base font-extrabold text-slate-900">
            <span>Current Total</span>
            <span>₹{Number(activeOrder.grandTotal || activeOrder.totalAmount || 0).toFixed(0)}</span>
          </div>
          <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Any additional dishes you order will be added to this bill.
          </p>
          <button
            onClick={handleAddMore}
            className="w-full bg-slate-900 hover:bg-black text-white font-extrabold py-3.5 rounded-2xl shadow-sm transition text-xs flex items-center justify-center gap-2 active:scale-98"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>+ Add More Items</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveTabDrawer;
