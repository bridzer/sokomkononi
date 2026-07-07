import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import { categoryIcon } from '../utils/categoryIcon';
import { copyText } from '../utils/format';

// ---------- Inline SVG icons ----------
const SearchIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
  </svg>
);

const SortIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
    <path d="M8 4v16m0 0l-3-3m3 3l3-3M16 20V4m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
    <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" strokeLinecap="round" />
  </svg>
);

// ---------- Category chip ----------
function CategoryChip({ active, to, icon, label, count }) {
  const cls = active
    ? 'bg-brand-700 text-white ring-1 ring-brand-700 shadow-sm'
    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400 hover:text-brand-700 hover:bg-brand-50';
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${cls}`}
    >
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`ml-1 min-w-[18px] px-1 text-[10px] font-semibold rounded-full leading-none py-0.5 ${
            active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export default function Shop() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search);

  useEffect(() => setQuery(search), [search]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    params.set('limit', '100');
    api
      .get(`/products?${params.toString()}`)
      .then((r) => setProducts(r.data.products || []))
      .finally(() => setLoading(false));
  }, [categorySlug, search, sort]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) || null,
    [categorySlug, categories]
  );

  const title = activeCategory?.name || 'All products';
  const totalCount = products.length;

  const hasActiveFilters = !!(categorySlug || search || sort);

  // ---------- Handlers ----------
  const submitSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (query.trim()) p.set('search', query.trim());
    else p.delete('search');
    setSearchParams(p);
  };

  const clearSearch = () => {
    const p = new URLSearchParams(searchParams);
    p.delete('search');
    setSearchParams(p);
    setQuery('');
  };

  const onCategoryChange = (slug) => {
    // Categories live in the path, not the query string.
    const qs = searchParams.toString();
    navigate(slug ? `/shop/${slug}${qs ? '?' + qs : ''}` : `/shop${qs ? '?' + qs : ''}`);
  };

  // Cycle: none → asc → desc → none
  const nextSort = () => {
    if (sort === 'price_asc') return 'price_desc';
    if (sort === 'price_desc') return '';
    return 'price_asc';
  };

  const toggleSort = () => {
    const next = nextSort();
    const p = new URLSearchParams(searchParams);
    if (next) p.set('sort', next);
    else p.delete('sort');
    setSearchParams(p);
  };

  const reset = () => {
    setSearchParams(new URLSearchParams());
    setQuery('');
    if (categorySlug) navigate('/shop');
  };

  const share = async () => {
    const url = window.location.href;
    const shareData = {
      title: `Kalro Farm — ${title}`,
      text: `Check out ${title.toLowerCase()} on Kalro Farm Kenya.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy path
    }
    const ok = await copyText(url);
    if (ok) toast.success('Link copied to clipboard');
    else toast.error('Could not copy link');
  };

  const sortLabel =
    sort === 'price_asc'
      ? 'Price ↑'
      : sort === 'price_desc'
      ? 'Price ↓'
      : 'Sort price';

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
      {/* Breadcrumb + Title */}
      <div className="mb-4 sm:mb-6">        
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
          <span className="text-sm text-slate-500">
            {loading ? '…' : `${totalCount} product${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* -------- Category chip strip -------- */}
      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 mb-4">
        <div
          role="tablist"
          aria-label="Filter by category"
          className="flex flex-wrap gap-2"
        >
          <CategoryChip
            to="/shop"
            active={!categorySlug}
            icon={categoryIcon('all')}
            label="All"
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              to={`/shop/${c.slug}`}
              active={categorySlug === c.slug}
              icon={categoryIcon(c.name)}
              label={c.name}
              count={c.product_count}
            />
          ))}
        </div>
      </div>

      {/* -------- Search + filter card -------- */}
      <div className="card p-3 sm:p-4 mb-6">
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <form onSubmit={submitSearch} className="relative">
            <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              className="input pl-9 pr-9 py-2.5 bg-slate-50 border-slate-200 focus:bg-white"
              placeholder="Search products, breeds, equipment…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="shop-category-select">Category</label>
            <div className="relative flex-1 sm:flex-none">
              <select
                id="shop-category-select"
                value={categorySlug || ''}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="input py-2.5 pr-9 appearance-none bg-slate-50 border-slate-200 focus:bg-white cursor-pointer min-w-[160px]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Action row: Sort · Reset · Share */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={toggleSort}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider ring-1 transition-colors ${
              sort
                ? 'bg-brand-50 text-brand-700 ring-brand-300'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
            aria-pressed={!!sort}
          >
            <SortIcon className="w-4 h-4" />
            {sortLabel}
          </button>

          <button
            type="button"
            onClick={reset}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider ring-1 ring-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
            Reset
          </button>

          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider ring-1 ring-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* -------- Product grid -------- */}
      {loading ? (
        <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-[4/3] bg-slate-100 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-5 w-1/3 bg-slate-100 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2" aria-hidden="true">🔍</div>
          <div className="text-slate-700 font-semibold">No products found</div>
          <div className="text-sm text-slate-500 mt-1">
            Try a different category or clear your search.
          </div>
          {hasActiveFilters && (
            <button onClick={reset} className="btn-outline mt-4 text-sm">
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
