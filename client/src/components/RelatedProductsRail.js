import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatProductPrice } from '../utils/pricing';
import SafeImage, { DEFAULT_FALLBACK } from './SafeImage';

const MODE_LABELS = {
  closest: 'You may also like',
  subcategory: 'More in this subcategory',
  category: 'More in this category',
  same_seller: 'More from this seller',
  top_selling_category: 'Top selling in this category',
  featured: 'Featured picks',
};

export default function RelatedProductsRail({ slug }) {
  const [products, setProducts] = useState([]);
  const [mode, setMode] = useState('closest');
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get(`/products/${slug}/related`, { params: { limit: 12 } })
      .then((r) => {
        setProducts(r.data.products || []);
        setMode(r.data.mode || 'closest');
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 360), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="mt-12">
        <div className="h-7 w-48 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-44 h-56 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="mt-12 pt-8 border-t border-slate-100">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Related products
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {MODE_LABELS[mode] || 'You may also like'}
          </h2>
        </div>
        <div className="hidden sm:flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="w-9 h-9 rounded-full border border-slate-200 bg-white shadow-sm grid place-items-center text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="w-9 h-9 rounded-full border border-slate-200 bg-white shadow-sm grid place-items-center text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin -mx-1 px-1"
      >
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.slug}`}
            className="snap-start shrink-0 w-44 sm:w-52 group rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <SafeImage
                src={p.image_url}
                fallback={DEFAULT_FALLBACK}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3">
              {p.category_name ? (
                <div className="text-[10px] uppercase tracking-wide text-brand-600 font-semibold truncate">
                  {p.category_name}
                </div>
              ) : null}
              <div className="font-semibold text-slate-800 text-sm line-clamp-2 leading-snug mt-0.5">
                {p.name}
              </div>
              <div className="mt-1.5 text-brand-700 font-bold text-sm">
                {formatProductPrice(p)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
