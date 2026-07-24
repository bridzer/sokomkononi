import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatProductPrice, orderWhatsAppMessage } from '../utils/format';
import { useCart } from '../context/CartContext';
import { getSellerDisplayName } from '../utils/delivery';
import { pickScriptForProduct } from '../utils/whatsappScripts';

import BookProductModal from './BookProductModal';
import SafeImage, { DEFAULT_FALLBACK } from './SafeImage';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [bookOpen, setBookOpen] = useState(false);
  const outOfStock = Number(product.stock) === 0;

  const actionCell =
    'flex flex-col items-center justify-center gap-px w-full min-w-0 py-1 px-0.5 rounded-md font-semibold text-[9px] leading-tight shadow-sm active:scale-95 transition-transform';

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
        {outOfStock ? (
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
        <div className="text-[11px] text-slate-500 line-clamp-1">
          Sold by {getSellerDisplayName(product)}
        </div>
        {product.age_stage && (
          <div className="text-xs text-slate-500 line-clamp-1">{product.age_stage}</div>
        )}

        <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
          <div className="text-lg font-extrabold text-brand-700 tabular-nums">
            {formatProductPrice(product)}
          </div>
          <div className="text-[11px] text-slate-500">/ {product.unit}</div>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-1">
          {outOfStock ? (
            <button
              type="button"
              onClick={() => setBookOpen(true)}
              className={`${actionCell} bg-amber-600 hover:bg-amber-700 text-white`}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
              </svg>
              <span className="whitespace-nowrap">Book</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => addItem(product)}
              className={`${actionCell} bg-slate-900 hover:bg-slate-800 text-white`}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.6 4h13.2M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <span className="whitespace-nowrap">Add to Cart</span>
            </button>
          )}
          
          <WhatsAppButton
            message={
              outOfStock
                ? pickScriptForProduct(product)
                : orderWhatsAppMessage(product)
            }
            className={`${actionCell} !inline-flex !flex-col !gap-px !py-1 !px-0.5 !text-[9px] bg-[#25D366] hover:bg-[#1ebe57] text-white`}
            placement="bottom-end"
            title="Order via WhatsApp on"
          >
            <svg viewBox="0 0 32 32" className="w-3 h-3 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5z" />
            </svg>
            <span className="whitespace-nowrap">WhatsApp</span>
          </WhatsAppButton>
        </div>
      </div>

      <BookProductModal
        product={product}
        open={bookOpen}
        onClose={() => setBookOpen(false)}
      />
    </div>
  );
}
