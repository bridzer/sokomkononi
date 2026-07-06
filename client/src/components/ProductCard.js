import React from 'react';
import { Link } from 'react-router-dom';
import { formatKsh, orderWhatsAppMessage } from '../utils/format';
import { useCart } from '../context/CartContext';
import WhatsAppButton from './WhatsAppButton';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  return (
    // NOTE: no `overflow-hidden` on the outer card — that would clip any
    // portal fallbacks and (previously) the WhatsAppButton popover. The
    // image is clipped by its own wrapper's `overflow-hidden` + `rounded-t-xl`.
    <div className="card group flex flex-col">
      <Link
        to={`/product/${product.slug}`}
        className="block relative aspect-[4/3] bg-slate-100 overflow-hidden rounded-t-xl"
      >
        <img
          src={product.image_url || FALLBACK_IMG}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.is_featured && (
          <span className="absolute top-2 left-2 badge bg-accent-500 text-white">Featured</span>
        )}
        {product.stock === 0 && (
          <span className="absolute top-2 right-2 badge bg-red-500 text-white">Out of stock</span>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        {product.category_name && (
          <span className="text-[11px] uppercase tracking-wider text-brand-600 font-semibold">
            {product.category_name}
          </span>
        )}
        <Link
          to={`/product/${product.slug}`}
          className="font-semibold text-slate-800 hover:text-brand-700 line-clamp-2"
        >
          {product.name}
        </Link>
        {product.age_stage && (
          <div className="text-xs text-slate-500">Age / Stage: {product.age_stage}</div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <div className="text-lg font-bold text-brand-700">{formatKsh(product.price)}</div>
            <div className="text-[11px] text-slate-500">{product.unit}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => addItem(product)}
            disabled={product.stock === 0}
            className="btn-primary flex-1 text-sm py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to cart
          </button>
          <WhatsAppButton
            message={orderWhatsAppMessage(product)}
            className="btn-whatsapp text-sm py-1.5 px-3"
            placement="bottom-end"
            title="Order via WhatsApp on"
          >
            <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor">
              <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5z" />
            </svg>
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}
