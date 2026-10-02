import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface OrderSuccessModalProps {
  orderResult: any;
  tableNumber?: string;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderResult,
  tableNumber,
  onClose,
}) => {
  if (!orderResult) return null;

  const orderNo = orderResult.orderNo || orderResult.order_no || orderResult.id?.slice(0, 8) || 'CONFIRMED';
  const isAppended = Boolean(orderResult.isAppended || orderResult.appended);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isAppended ? 'Added to Running Bill!' : 'Order Sent to Kitchen!'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Your dishes are being prepared fresh by the kitchen.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-left text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Order Reference</span>
            <span className="font-bold text-slate-900">#{orderNo}</span>
          </div>
          {tableNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Table</span>
              <span className="font-bold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded-md text-[11px]">
                Table {tableNumber}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Kitchen Status</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              CONFIRMED
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-2 active:scale-98"
        >
          <span>Return to Menu</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default OrderSuccessModal;
