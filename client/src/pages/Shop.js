import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (search) params.set('search', search);
    params.set('limit', '100');
    api
      .get(`/products?${params.toString()}`)
      .then((r) => setProducts(r.data.products || []))
      .finally(() => setLoading(false));
  }, [categorySlug, search]);

  const title = useMemo(() => {
    if (categorySlug) {
      const c = categories.find((x) => x.slug === categorySlug);
      return c ? c.name : 'Shop';
    }
    return 'All products';
  }, [categorySlug, categories]);

  const submitSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) params.set('search', query);
    else params.delete('search');
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-slate-500">
          <Link to="/" className="hover:underline">Home</Link> / <Link to="/shop" className="hover:underline">Shop</Link>
          {categorySlug && <> / <span className="text-slate-700">{title}</span></>}
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mt-1">{title}</h1>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <form onSubmit={submitSearch} className="flex gap-2">
            <input
              className="input"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn-primary" type="submit">Go</button>
          </form>

          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-700 mb-2">Categories</div>
            <div className="space-y-1">
              <Link
                to={`/shop`}
                className={`block px-2 py-1 rounded text-sm ${
                  !categorySlug ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                All products
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/shop/${c.slug}`}
                  className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                    categorySlug === c.slug
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-slate-400">{c.product_count}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div>
          {loading ? (
            <div className="text-center py-16 text-slate-500">Loading…</div>
          ) : products.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              No products found.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
