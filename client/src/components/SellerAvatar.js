import React, { useState } from 'react';

/** Circular seller photo with letter fallback. */
export default function SellerAvatar({
  seller,
  size = 'md',
  className = '',
  ring = true,
}) {
  const name = seller?.name || 'S';
  const src = seller?.avatar_url || '';
  const [broken, setBroken] = useState(false);
  const sizeClass =
    size === 'xl'
      ? 'w-24 h-24 text-3xl'
      : size === 'lg'
        ? 'w-16 h-16 text-2xl'
        : size === 'sm'
          ? 'w-9 h-9 text-sm'
          : 'w-12 h-12 text-lg';

  const showImg = src && !broken;

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-white grid place-items-center font-bold shrink-0 overflow-hidden ${
        ring ? 'ring-2 ring-white/90 shadow-md shadow-brand-900/20' : ''
      } ${className}`}
    >
      {showImg ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{String(name).slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
