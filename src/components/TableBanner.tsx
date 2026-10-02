import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, MapPin, User, LogOut } from 'lucide-react';
import type { TableSessionInfo, CustomerAuth } from '../services/qrOrderService';

interface TableBannerProps {
  tableInfo: TableSessionInfo;
  cartItemCount: number;
  onOpenCart: () => void;
  customer?: CustomerAuth | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const TableBanner: React.FC<TableBannerProps> = ({
  tableInfo,
  cartItemCount,
  onOpenCart,
  customer,
  onOpenAuth,
  onLogout,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const restaurantName = tableInfo.clientName || tableInfo.restaurantName || 'Restaurant';
  const rawBranch = tableInfo.branchName || tableInfo.branchSlug || tableInfo.location || '';
  const branchName = rawBranch.trim().toLowerCase() !== restaurantName.trim().toLowerCase() ? rawBranch : '';
  const tableNum = tableInfo.tableNumber || 'Table';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const initial = customer?.name ? customer.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 shrink-0 shadow-2xs sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Restaurant Name, Branch, Table Number */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-black text-slate-900 text-lg leading-tight tracking-tight">
              {restaurantName}
            </h1>
            {branchName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                <MapPin className="w-3 h-3 text-slate-400" />
                {branchName}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center font-extrabold text-xs text-orange-700 bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-lg tracking-wide shadow-2xs">
              Table {tableNum}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cart Icon Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-200/70 transition shadow-2xs flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5 text-slate-800" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                {cartItemCount}
              </span>
            )}
          </button>

          {/* Round Profile Button (After Cart Button) */}
          {customer ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-orange-500/20 active:scale-95 transition-all cursor-pointer"
                aria-label="Account Menu"
                title={customer.name || 'Account'}
              >
                {initial}
              </button>

              {/* Dropdown Menu (Sign Out only) */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {customer.name || 'Guest'}
                    </p>
                    {customer.email && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {customer.email}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="Log In / Sign Up"
              >
                <User className="w-4 h-4 text-slate-600" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default TableBanner;
