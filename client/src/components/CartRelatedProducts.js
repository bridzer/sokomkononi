import React, { useEffect, useState } from 'react';
import api from '../api/client';
import ProductCard from './ProductCard';

/**
 * Related / suggested products on the cart page (addable to cart).
 * Prefers related-to-first-item; falls back to featured shop picks.
 */
export default function CartRelatedProducts({ items = [] }) {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState('You may also like');
  const [loading, setLoading] = useState(true);

  const exclude = new Set(items.map((i) => i.product_id));
  const seedSlug = items.find((i) => i.slug)?.slug;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        if (seedSlug) {
          const { data } = await api.get(`/products/${seedSlug}/related`, {
            params: { limit: 12 },
          });
          if (cancelled) return;
          const list = (data.products || []).filter((p) => !exclude.has(p.id));
          if (list.length) {
            setProducts(list.slice(0, 8));
            setTitle('Complete your order');
            return;
          }
        }
        const { data } = await api.get('/products', {
          params: { featured: true, limit: 12 },
        });
        if (cancelled) return;
        const list = (data.products || []).filter((p) => !exclude.has(p.id));
        setProducts(list.slice(0, 8));
        setTitle('Popular picks');
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // exclude set identity changes each render — seed + cart ids is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSlug, items.map((i) => i.product_id).join(',')]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Related products
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tap Add to cart — no need to leave checkout.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
