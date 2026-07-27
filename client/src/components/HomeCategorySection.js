import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import ProductListingGrid from './ProductListingGrid';
import { categoryIcon } from '../utils/categoryIcon';
import { copyText } from '../utils/format';
import { trackSearch } from '../utils/analytics';

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

function CategoryChip({ active, to, icon, label, count, onClick }) {
  const cls = active
    ? 'bg-brand-700 text-white ring-1 ring-brand-700 shadow-sm'
    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400 hover:text-brand-700 hover:bg-brand-50';

  const content = (
    <>
      <span className="text-base leading-none" aria-hidden="true">
        {icon}
      </span>
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
    </>
  );

  const className = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${cls}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}

/**
 * Home page category section:
 * - Tabs = main categories (+ All featured)
 * - Search / sort / reset / share on featured products
 * - Clicking a main category navigates to /shop/:mainSlug
 */
export default function HomeCategorySection() {
  const navigate = useNavigate();
  const [mains, setMains] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  /** null = All (featured) */
  const [activeSlug, setActiveSlug] = useState(null);

  useEffect(() => {
    api.get('/categories?roots=true').then((r) => {
      const list = (r.data.categories || []).filter(
        (c) => Number(c.product_count) > 0
      );
      setMains(list);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('featured', 'true');
    params.set('limit', '48');
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    api
      .get(`/products?${params.toString()}`)
      .then((r) => setProducts(r.data.products || []))
      .finally(() => setLoading(false));
  }, [search, sort]);

  useEffect(() => {
    if (search) trackSearch(search);
  }, [search]);

  const showingAll = activeSlug == null;
  const hasActiveFilters = !!(search || sort);

  const title = useMemo(() => {
    if (search) return `Featured matching “${search}”`;
    return 'Featured products';
  }, [search]);

  const submitSearch = (e) => {
    e.preventDefault();
    setSearch(query.trim());
  };

  const clearSearch = () => {
    setQuery('');
    setSearch('');
  };

  const nextSort = () => {
    if (sort === 'price_asc') return 'price_desc';
    if (sort === 'price_desc') return '';
    return 'price_asc';
  };

  const toggleSort = () => setSort(nextSort());

  const reset = () => {
    setQuery('');
    setSearch('');
    setSort('');
    setActiveSlug(null);
  };

  const share = async () => {
    const url = window.location.origin + '/';
    const shareData = {
      title: 'Soko Mkononi',
      text: search
        ? `Featured products matching “${search}” on Soko Mkononi.`
        : 'Browse farm products on Soko Mkononi — Kenya’s agricultural marketplace.',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* cancelled */
    }
    const ok = await copyText(url);
    if (ok) toast.success('Link copied to clipboard');
    else toast.error('Could not copy link');
  };

  const sortLabel =
    sort === 'price_asc' ? 'Price ↑' : sort === 'price_desc' ? 'Price ↓' : 'Sort price';

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Shop by category</h2>
        <p className="mt-1 text-sm text-slate-500">
          Browse featured products below, or open a main category to see subcategories in the shop.
        </p>
      </div>

      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 mb-4">
        <div role="tablist" aria-label="Main categories" className="flex flex-wrap gap-2">
          <CategoryChip
            active={showingAll}
            icon={categoryIcon('all')}
            label="All"
            onClick={() => setActiveSlug(null)}
          />
          {mains.map((c) => (
            <CategoryChip
              key={c.id}
              to={`/shop/${c.slug}`}
              active={false}
              icon={categoryIcon(c.slug || c.name)}
              label={c.name}
              count={c.product_count}
            />
          ))}
        </div>
      </div>

      {/* Search + filter card (featured products) */}
      <div className="card p-3 sm:p-4 mb-6">
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <form onSubmit={submitSearch} className="relative">
            <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              className="input pl-9 pr-9 py-2.5 bg-slate-50 border-slate-200 focus:bg-white"
              placeholder="Search featured products…"
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

          <div className="relative flex-1 sm:flex-none">
            <label className="sr-only" htmlFor="home-category-select">
              Category
            </label>
            <select
              id="home-category-select"
              value=""
              onChange={(e) => {
                if (e.target.value) navigate(`/shop/${e.target.value}`);
              }}
              className="input py-2.5 pr-9 appearance-none bg-slate-50 border-slate-200 focus:bg-white cursor-pointer min-w-[160px] w-full"
            >
              <option value="">Browse a category…</option>
              {mains.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

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

      <div className="mb-4 flex items-baseline gap-3 flex-wrap">
        <h3 className="text-lg sm:text-xl font-bold text-slate-800">{title}</h3>
        <span className="text-sm text-slate-500">
          {loading ? '…' : `${products.length} product${products.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <ProductListingGrid
        products={products}
        loading={loading}
        adContext={{ home: true, search }}
        emptyState={
          <div className="card p-10 text-center">
            <div className="text-slate-700 font-semibold">
              {search ? 'No featured products match your search' : 'No featured products yet'}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {search
                ? 'Try different keywords, or browse the full shop.'
                : 'Mark products as featured in admin, or browse a category above.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {hasActiveFilters && (
                <button type="button" onClick={reset} className="btn-outline text-sm">
                  Reset filters
                </button>
              )}
              <Link to="/shop" className="btn-outline inline-flex text-sm">
                Browse shop
              </Link>
            </div>
          </div>
        }
      />

      <div className="mt-6 text-center">
        <Link to="/shop" className="btn-primary text-sm sm:text-base">
          View all products
        </Link>
      </div>
    </div>
  );
}
