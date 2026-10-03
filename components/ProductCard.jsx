import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';

/**
 * Customer-facing product card — visual parity with POS PosProductCard.
 * Renders an image header only when the item has an imageUrl; otherwise a
 * compact no-image layout so both menus look intentional.
 */
export default function ProductCard({
  item,
  qty = 0,
  sym = '₹',
  dec = 2,
  brandColor = '#f97316',
  onAdd,
  onRemove,
}) {
  const hasImage = Boolean(item.imageUrl);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
  }, [item.imageUrl]);

  const price = `${sym}${Number(item.price || 0).toFixed(dec)}`;

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    onAdd(item);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAdd(item);
        }
      }}
      className={`relative flex flex-col bg-qrcard rounded-qr border transition-all duration-200 cursor-pointer select-none
        ${qty > 0 ? 'shadow-md' : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'}
        ${hasImage ? '' : 'min-h-[92px]'}`}
      style={{ borderColor: qty > 0 ? brandColor : '#e2e8f0' }}
    >
      {/* FSSAI Veg / Non-Veg Indicator */}
      <span
        title={item.isVeg ? 'Veg' : 'Non-Veg'}
        className="absolute z-10 flex items-center justify-center bg-white rounded-[4px] border-[1.5px]"
        style={{
          top: hasImage ? 8 : 10,
          right: 8,
          width: 15,
          height: 15,
          borderColor: item.isVeg ? '#16a34a' : '#ef4444',
        }}
      >
        <span
          className="block"
          style={{
            width: 7,
            height: 7,
            borderRadius: item.isVeg ? '50%' : '1px',
            background: item.isVeg ? '#16a34a' : '#ef4444',
          }}
        />
      </span>

      {/* Cart quantity badge */}
      {qty > 0 && (
        <span
          className="absolute -top-2 -left-2 w-[22px] h-[22px] rounded-full bg-white border-2 text-[11px] font-extrabold flex items-center justify-center shadow"
          style={{ borderColor: brandColor, color: brandColor }}
        >
          {qty}
        </span>
      )}

      {/* Image header (only when present) */}
      {hasImage && (
        <div className="relative w-full aspect-[16/10] bg-slate-50 rounded-t-qr overflow-hidden flex items-center justify-center p-2 border-b border-qrlineSoft">
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50" />
          )}
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            className={`w-full h-full object-contain transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between gap-1.5 p-2.5">
        <div
          className="text-[13px] font-bold text-qrink leading-snug line-clamp-2"
          style={hasImage ? undefined : { paddingRight: 20, minHeight: 18 }}
          title={item.name}
        >
          {item.name}
        </div>

        {!hasImage && item.description && (
          <p className="text-[11px] text-qrmuted line-clamp-2 leading-snug">{item.description}</p>
        )}

        <div className="flex items-baseline mt-0.5">
          <span className="text-[13px] font-extrabold text-qrink tracking-tight">{price}</span>
        </div>

        {qty > 0 ? (
          <div
            className="mt-1 flex items-center justify-between w-full h-8 rounded-[10px] overflow-hidden border-[1.5px]"
            style={{ borderColor: brandColor, background: '#fff7ed' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => onRemove(item)}
              className="w-9 h-full flex items-center justify-center text-brand-600 hover:bg-black/5 active:bg-black/10"
            >
              <FaMinus className="text-[10px]" />
            </button>
            <span className="flex-1 text-center text-[13px] font-extrabold text-brand-600">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => onAdd(item)}
              className="w-9 h-full flex items-center justify-center text-brand-600 hover:bg-black/5 active:bg-black/10"
            >
              <FaPlus className="text-[10px]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(item);
            }}
            className="mt-1 w-full h-8 rounded-[10px] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
            style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #ea580c 100%)` }}
          >
            <FaPlus className="text-[10px]" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
}