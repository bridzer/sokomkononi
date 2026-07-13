import React from 'react';
import { Link } from 'react-router-dom';
import { formatProductPrice, orderWhatsAppMessage } from '../utils/format';
import { useCart } from '../context/CartContext';
import WhatsAppButton from './WhatsAppButton';

import SafeImage, { DEFAULT_FALLBACK } from './SafeImage';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  return (
    // NOTE: no `overflow-hidden` on the outer card — that would clip any
    // portal fallbacks and (previously) the WhatsAppButton popover. The
    // image is clipped by its own wrapper's `overflow-hidden` + `rounded-t-xl`.
    <div className="card group flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
      <Link
        to={`/product/${product.slug}`}
        className="block relative aspect-[4/3] bg-slate-100 overflow-hidden rounded-t-xl"
      >
        <SafeImage
          src={product.image_url}
          fallback={DEFAULT_FALLBACK}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.is_featured && (
          <span className="absolute top-2 left-2 badge bg-accent-500 text-white shadow">
            ★ Featured
          </span>
        )}
        {product.stock === 0 ? (
          <span className="absolute top-2 right-2 badge bg-red-500 text-white shadow">
            Out of stock
          </span>
        ) : product.stock <= 3 ? (
          <span className="absolute top-2 right-2 badge bg-orange-500 text-white shadow">
            Only {product.stock} left
          </span>
        ) : null}
      </Link>

      <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
        {product.category_name && (
          <span className="text-[10px] uppercase tracking-wider text-brand-600 font-semibold">
            {product.category_name}
          </span>
        )}
        <Link
          to={`/product/${product.slug}`}
          className="font-semibold text-slate-800 hover:text-brand-700 line-clamp-2 leading-tight text-[15px]"
        >
          {product.name}
        </Link>
        {product.age_stage && (
          <div className="text-xs text-slate-500 line-clamp-1">
            {product.age_stage}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
          <div className="text-lg font-extrabold text-brand-700 tabular-nums">
            {formatProductPrice(product)}
          </div>
          <div className="text-[11px] text-slate-500">/ {product.unit}</div>
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => addItem(product)}
            disabled={product.stock === 0}
            className="btn-primary flex-1 min-w-0 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.6 4h13.2M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span className="truncate">Add to cart</span>
          </button>
          <WhatsAppButton
            message={orderWhatsAppMessage(product)}
            className="btn-whatsapp text-sm py-2 px-3 shrink-0"
            placement="bottom-end"
            title="Order via WhatsApp on"
          >
            <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5z" />
            </svg>
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}
