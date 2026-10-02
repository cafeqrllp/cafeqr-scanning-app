import React from 'react';
import { ChevronRight, Utensils } from 'lucide-react';
import type { ActiveOrder } from '../services/qrOrderService';

interface LiveOrderBannerProps {
  activeOrder: ActiveOrder;
  onViewOrder: () => void;
}

export const LiveOrderBanner: React.FC<LiveOrderBannerProps> = ({
  activeOrder,
  onViewOrder,
}) => {
  if (!activeOrder) return null;

  const lines = (activeOrder.lines || []).filter((line: any) => !line.isactive || line.isactive === 'Y');
  const itemCount = lines.length;
  const total = Number(activeOrder.grandTotal || activeOrder.totalAmount || 0);
  const orderDisplayNo = activeOrder.orderNo || (activeOrder.id ? activeOrder.id.slice(0, 8) : 'Live');

  // Friendly status text & styles
  const rawStatus = (activeOrder.orderStatus || 'ORDERED').toUpperCase();
  let statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
  let statusLabel = 'In Kitchen';

  if (rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED' || rawStatus === 'SERVED') {
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    statusLabel = 'Served';
  } else if (rawStatus === 'PREPARING' || rawStatus === 'IN_PROGRESS' || rawStatus === 'COOKING') {
    statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
    statusLabel = 'Preparing';
  } else if (rawStatus === 'CONFIRMED' || rawStatus === 'ACCEPTED') {
    statusBadgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
    statusLabel = 'Confirmed';
  } else if (rawStatus === 'READY') {
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    statusLabel = 'Ready to Serve';
  } else if (rawStatus === 'BILLED') {
    statusBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
    statusLabel = 'Bill Issued';
  } else if (rawStatus === 'CANCELLED' || rawStatus === 'VOID') {
    statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
    statusLabel = 'Cancelled';
  } else {
    statusLabel = rawStatus;
  }

  return (
    <div
      onClick={onViewOrder}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewOrder();
        }
      }}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer active:scale-[0.99]"
      aria-label="View live order details"
    >
      {/* Decorative accent bar on left */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl" />

      <div className="pl-1.5">
        {/* Top row: Live badge + Order No + Kitchen status pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 text-[11px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Order
            </span>
            <span className="text-xs font-black text-slate-800 tracking-tight">
              #{orderDisplayNo}
            </span>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border shadow-2xs ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Bottom row: Running total + Items count + Action pill */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-emerald-100/60">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-black text-slate-900 text-sm">
              ₹{total.toFixed(0)}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Utensils className="w-3 h-3 text-emerald-600" />
              {itemCount} item{itemCount === 1 ? '' : 's'} in tab
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-emerald-600/70 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default LiveOrderBanner;
