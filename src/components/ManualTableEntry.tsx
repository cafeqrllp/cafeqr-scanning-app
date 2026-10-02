import React, { useState } from 'react';
import { QrCode, ArrowRight, AlertCircle } from 'lucide-react';

interface ManualTableEntryProps {
  onSelectTable: (clientId: string, orgId: string, tableId: string) => void;
  error?: string;
}

export const ManualTableEntry: React.FC<ManualTableEntryProps> = ({
  onSelectTable,
  error,
}) => {
  const [clientId, setClientId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [tableId, setTableId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !tableId.trim()) return;
    onSelectTable(clientId.trim(), orgId.trim() || 'null', tableId.trim());
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-xl border border-slate-200/80 text-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <QrCode className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Scan Table QR Code
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Please scan the QR code placed on your dining table to open the live menu and place orders.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 text-left">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Manual Table Access (Testing)
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Client ID or Restaurant Slug *
              </label>
              <input
                type="text"
                placeholder="e.g. kozhikode"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Branch / Org (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. main or null"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Table ID / Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 1 or table UUID"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
            >
              <span>View Table Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualTableEntry;
