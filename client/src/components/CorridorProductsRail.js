import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ProductCard from './ProductCard';
import { DEFAULT_CORRIDOR } from '../utils/proximity';

/** Home rail: corridor-featured marketplace picks. */
export default function CorridorProductsRail() {
  const [products, setProducts] = useState([]);
  const [counties, setCounties] = useState(DEFAULT_CORRIDOR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [corridorRes, productsRes] = await Promise.all([
          api.get('/market/corridor').catch(() => ({ data: { counties: DEFAULT_CORRIDOR } })),
          api.get('/products?corridor=true&limit=8'),
        ]);
        if (cancelled) return;
        const list = corridorRes.data?.counties?.length
          ? corridorRes.data.counties
          : DEFAULT_CORRIDOR;
        setCounties(list);
        let rows = productsRes.data?.products || [];
        if (!rows.length) {
          const featured = await api.get('/products?featured=true&limit=8');
          rows = featured.data?.products || [];
        }
        setProducts(rows);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  const qs = new URLSearchParams({ corridor: '1' }).toString();

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-brand-800">
            Around the corridor
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Picks near {counties.slice(0, 3).join(', ')}
            {counties.length > 3 ? ' & nearby' : ''}
          </p>
        </div>
        <Link
          to={`/shop?${qs}`}
          className="text-sm font-semibold text-brand-700 hover:underline whitespace-nowrap"
        >
          View corridor
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {products.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
