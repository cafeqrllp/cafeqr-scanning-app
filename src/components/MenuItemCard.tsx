import React, { useState } from 'react';
import { Plus, Minus, Utensils, Sparkles } from 'lucide-react';
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
      className={`rounded-2xl p-2.5 sm:p-3 border transition-all flex flex-col justify-between select-none relative ${
        isOutOfStock
          ? 'bg-slate-100/90 border-slate-200/90 opacity-60 grayscale cursor-not-allowed shadow-none'
          : cartQty > 0
          ? 'bg-white border-orange-500/80 shadow-sm ring-1 ring-orange-500/20 cursor-pointer group active:scale-[0.99]'
          : 'bg-white border-slate-200/70 shadow-xs hover:border-slate-300 hover:shadow-md cursor-pointer group active:scale-[0.99]'
      }`}
    >
      <div>
        {/* Food Image Container */}
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
          {hasImage ? (
            <img
              src={imgUrl}
              alt={item.name}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isOutOfStock ? 'grayscale contrast-75' : 'group-hover:scale-105'
              }`}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-50 to-orange-50/60 flex flex-col items-center justify-center text-slate-300 p-2">
              <Utensils className="w-6 h-6 mb-1 text-orange-200" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center line-clamp-1">
                {item.category || 'Specialty'}
              </span>
            </div>
          )}

          {/* Out of Stock Overlay Badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
              <span className="bg-slate-900/90 text-white border border-white/20 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Out of Stock
              </span>
            </div>
          )}

          {/* Veg / Non-Veg Badge */}
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs p-1 rounded-md shadow-xs z-20">
            <span
              className={`w-3 h-3 border rounded-xs flex items-center justify-center ${
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
          </div>

          {/* Options Badge if product has variants and is in stock */}
          {hasVariants && !isOutOfStock && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-0.5 z-20">
              <Sparkles className="w-2.5 h-2.5 text-orange-400" />
              <span>Options</span>
            </div>
          )}
        </div>

        {/* Dish Title & Price */}
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className={`font-extrabold text-xs sm:text-sm leading-tight line-clamp-1 transition-colors ${
              isOutOfStock ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900 group-hover:text-orange-600'
            }`}>
              {item.name}
            </h3>
            <span className={`font-extrabold text-xs sm:text-sm shrink-0 ${
              isOutOfStock ? 'text-slate-400' : 'text-slate-900'
            }`}>
              ₹{price.toFixed(price % 1 === 0 ? 0 : 2)}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Out of Stock Label or Quantity Stepper */}
      {isOutOfStock ? (
        <div className="mt-2.5 py-1 px-2 bg-slate-200/90 text-slate-500 rounded-xl text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider border border-slate-300/80">
          Out of Stock
        </div>
      ) : cartQty > 0 ? (
        <div 
          className="mt-2.5 pt-1"
          onClick={(e) => e.stopPropagation()} // Prevent re-triggering card click
        >
          <div className="flex items-center justify-between bg-orange-600 text-white rounded-xl px-2 py-1.5 w-full shadow-sm">
            <button
              type="button"
              onClick={onRemoveFromCart}
              className="p-1 hover:bg-orange-700 rounded-md transition active:scale-90 cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-extrabold text-xs">{cartQty}</span>
            <button
              type="button"
              onClick={onAddToCart}
              className="p-1 hover:bg-orange-700 rounded-md transition active:scale-90 cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MenuItemCard;
