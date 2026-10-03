import React, { useState } from 'react';
import { Plus, Minus, Sparkles } from 'lucide-react';
import type { MenuItem } from '../services/qrOrderService';

interface MenuItemCardProps {
  item: MenuItem;
  cartQty: number;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
  onOpenDetails?: () => void;
}

export const checkHasVariants = (item: MenuItem): boolean => {
  if (item.variants && item.variants.length > 0) return true;
  const lower = (item.name || '').toLowerCase();
  return lower.includes('dosa') || lower.includes('mandhi') || lower.includes('biryani');
};

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  cartQty,
  onAddToCart,
  onRemoveFromCart,
  onOpenDetails,
}) => {
  const isVeg = item.isVegetarian || item.dietary === 'VEG';
  const imgUrl = item.imageUrl || item.image;
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(imgUrl && !imageError);
  const price = Number(item.price || 0);

  const hasVariants = checkHasVariants(item);
  const isOutOfStock = Boolean(item.outOfStock);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (hasVariants) {
      onOpenDetails?.();
    } else {
      if (cartQty === 0) {
        onAddToCart();
      }
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl p-3 border transition-all duration-200 flex flex-col justify-between select-none relative group ${
        isOutOfStock
          ? 'bg-slate-50 border-slate-200/80 opacity-60 grayscale cursor-not-allowed shadow-none'
          : cartQty > 0
          ? 'bg-white border-orange-500/80 shadow-md ring-1 ring-orange-500/20 cursor-pointer active:scale-[0.99]'
          : 'bg-white border-slate-200/80 shadow-2xs hover:border-orange-300 hover:shadow-md cursor-pointer active:scale-[0.99]'
      }`}
    >
      <div>
        {/* Top Header Row for NO-IMAGE items (FSSAI Veg/Non-Veg Badge in top right corner like POS) */}
        {!hasImage && (
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {item.category || 'Item'}
            </span>

            {/* FSSAI Veg / Non-Veg Indicator */}
            <span
              className={`w-4 h-4 border rounded-[4px] flex items-center justify-center shrink-0 bg-white shadow-2xs ${
                isVeg ? 'border-emerald-600' : 'border-rose-600'
              }`}
              title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`w-1.5 h-1.5 ${isVeg ? 'rounded-full bg-emerald-600' : 'rounded-[1px] bg-rose-600'}`}
              />
            </span>
          </div>
        )}

        {/* Food Image Container (Only rendered when dish has a valid imageUrl) */}
        {hasImage && (
          <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
            <img
              src={imgUrl}
              alt={item.name}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isOutOfStock ? 'grayscale contrast-75' : 'group-hover:scale-105'
              }`}
              loading="lazy"
              onError={() => setImageError(true)}
            />

            {/* Out of Stock Overlay Badge */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center p-1.5 z-20">
                <span className="bg-slate-900/90 text-white border border-white/10 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Out of Stock
                </span>
              </div>
            )}

            {/* FSSAI Veg / Non-Veg Badge over image */}
            <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-xs p-0.5 rounded-md shadow-xs z-20">
              <span
                className={`w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center ${
                  isVeg ? 'border-emerald-600' : 'border-rose-600'
                }`}
                title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
              >
                <span
                  className={`w-1.5 h-1.5 ${isVeg ? 'rounded-full bg-emerald-600' : 'rounded-[1px] bg-rose-600'}`}
                />
              </span>
            </div>
          </div>
        )}

        {/* Dish Title & Description */}
        <div className="space-y-1 mb-2.5">
          <h3
            className={`font-black text-xs sm:text-sm leading-snug line-clamp-2 transition-colors ${
              isOutOfStock
                ? 'text-slate-400 line-through decoration-slate-300'
                : 'text-slate-900 group-hover:text-orange-600'
            }`}
          >
            {item.name}
          </h3>

          {item.description && (
            <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-normal">
              {item.description}
            </p>
          )}

          {/* Price Tag */}
          <div className="pt-0.5 flex items-baseline">
            <span
              className={`font-black text-xs sm:text-sm tracking-tight ${
                isOutOfStock ? 'text-slate-400' : 'text-slate-900'
              }`}
            >
              ₹{price.toFixed(price % 1 === 0 ? 0 : 2)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Button / Quantity Stepper (Exact parity with POS buttons) */}
      <div className="pt-1 mt-auto" onClick={(e) => e.stopPropagation()}>
        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="w-full py-1.5 px-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
          >
            Unavailable
          </button>
        ) : cartQty > 0 ? (
          <div className="flex items-center justify-between bg-orange-600 text-white rounded-xl px-2 py-1.5 w-full shadow-xs">
            <button
              type="button"
              onClick={onRemoveFromCart}
              className="p-1 hover:bg-orange-700 rounded-lg transition active:scale-90 cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-xs sm:text-sm">{cartQty}</span>
            <button
              type="button"
              onClick={onAddToCart}
              className="p-1 hover:bg-orange-700 rounded-lg transition active:scale-90 cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : hasVariants ? (
          <button
            type="button"
            onClick={onOpenDetails}
            className="w-full py-2 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/90 font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span>Options &gt;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onAddToCart}
            className="w-full py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuItemCard;
