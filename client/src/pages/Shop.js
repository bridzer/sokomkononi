import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import ProductListingGrid from '../components/ProductListingGrid';
import { categoryIcon } from '../utils/categoryIcon';
import { copyText } from '../utils/format';
import { trackSearch } from '../utils/analytics';
import { loadKenyaLocations } from '../utils/address';
import {
  countyNameToSlug,
  countySlugToName,
  heatLabel,
  DEFAULT_CORRIDOR,
} from '../utils/proximity';

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

function CategoryChip({ active, to, icon, label, count }) {
  const cls = active
    ? 'bg-brand-700 text-white ring-1 ring-brand-700 shadow-sm'
    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400 hover:text-brand-700 hover:bg-brand-50';
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${cls}`}
    >
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
    </Link>
  );
}

export default function Shop() {
  const { categorySlug, countySlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';
  const countyFromQuery = searchParams.get('county') || '';
  const countyFromPath = countySlug ? countySlugToName(countySlug) : '';
  const county = countyFromQuery || countyFromPath;
  const proximity = searchParams.get('proximity') === '1' || searchParams.get('proximity') === 'true';
  const corridor =
    searchParams.get('corridor') === '1' || searchParams.get('corridor') === 'true';

  const [products, setProducts] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search);
  const [counties, setCounties] = useState([]);
  const [pulse, setPulse] = useState(null);

  useEffect(() => setQuery(search), [search]);

  useEffect(() => {
    api.get('/categories?tree=true').then((r) => setTree(r.data.categories || []));
    loadKenyaLocations()
      .then((data) => setCounties(data.counties || []))
      .catch(() => setCounties(DEFAULT_CORRIDOR));
  }, []);

  const { mainCategory, subCategory, subTabs, productFilterSlug } = useMemo(() => {
    if (!categorySlug) {
      return {
        mainCategory: null,
        subCategory: null,
        subTabs: [],
        productFilterSlug: null,
      };
    }

    const main = tree.find((c) => c.slug === categorySlug);
    if (main) {
      return {
        mainCategory: main,
        subCategory: null,
        subTabs: main.children || [],
        productFilterSlug: main.slug,
      };
    }

    for (const m of tree) {
      const child = (m.children || []).find((c) => c.slug === categorySlug);
      if (child) {
        return {
          mainCategory: m,
          subCategory: child,
          subTabs: m.children || [],
          productFilterSlug: child.slug,
        };
      }
    }

    return {
      mainCategory: null,
      subCategory: null,
      subTabs: [],
      productFilterSlug: categorySlug,
    };
  }, [categorySlug, tree]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (productFilterSlug) params.set('category', productFilterSlug);
    if (search) params.set('search', search);
    if (sort && sort !== 'nearby') params.set('sort', sort);
    if (county) params.set('county', county);
    if (proximity || sort === 'nearby') params.set('proximity', 'true');
    if (corridor) params.set('corridor', 'true');
    params.set('limit', '100');
    api
      .get(`/products?${params.toString()}`)
      .then((r) => setProducts(r.data.products || []))
      .finally(() => setLoading(false));

    if (county || search || productFilterSlug) {
      api
        .post('/market/search-events', {
          search_query: search || null,
          category_slug: productFilterSlug || null,
          county: county || null,
        })
        .catch(() => {});
    }
  }, [productFilterSlug, search, sort, county, proximity, corridor]);

  useEffect(() => {
    if (search) trackSearch(search);
  }, [search]);

  useEffect(() => {
    if (!county && !productFilterSlug) {
      setPulse(null);
      return;
    }
    const params = new URLSearchParams();
    if (county) params.set('county', county);
    if (productFilterSlug) params.set('category', productFilterSlug);
    api
      .get(`/market/pulse?${params.toString()}`)
      .then((r) => setPulse(r.data.pulse))
      .catch(() => setPulse(null));
  }, [county, productFilterSlug]);

  const title = county
    ? `${subCategory?.name || mainCategory?.name || 'Farm goods'} in ${county}`
    : subCategory?.name || mainCategory?.name || 'All products';
  const totalCount = products.length;
  const hasActiveFilters = !!(categorySlug || search || sort || county || corridor || proximity);
  const showSubTabs = !!mainCategory;

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

  const onSubChange = (slug) => {
    const qs = searchParams.toString();
    const base = slug
      ? `/shop/${slug}`
      : mainCategory
        ? `/shop/${mainCategory.slug}`
        : '/shop';
    navigate(`${base}${qs ? `?${qs}` : ''}`);
  };

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

  const setCountyFilter = (value) => {
    const p = new URLSearchParams(searchParams);
    if (value) {
      p.set('county', value);
      p.set('proximity', '1');
    } else {
      p.delete('county');
      p.delete('proximity');
    }
    if (countySlug) {
      const base = categorySlug ? `/shop/${categorySlug}` : '/shop';
      navigate(`${base}?${p.toString()}`);
    } else {
      setSearchParams(p);
    }
  };

  const toggleCorridor = () => {
    const p = new URLSearchParams(searchParams);
    if (corridor) p.delete('corridor');
    else p.set('corridor', '1');
    setSearchParams(p);
  };

  const reset = () => {
    setSearchParams(new URLSearchParams());
    setQuery('');
    if (countySlug) navigate(categorySlug ? `/shop/${categorySlug}` : '/shop');
    else if (mainCategory) navigate(`/shop/${mainCategory.slug}`);
    else if (categorySlug) navigate('/shop');
  };

  const share = async () => {
    const url = window.location.href;
    const shareData = {
      title: `Soko Mkononi — ${title}`,
      text: `Check out ${title.toLowerCase()} on Soko Mkononi — Kenya’s agricultural marketplace.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* fall through */
    }
    const ok = await copyText(url);
    if (ok) toast.success('Link copied to clipboard');
    else toast.error('Could not copy link');
  };

  const sortLabel =
    sort === 'price_asc' ? 'Price ↑' : sort === 'price_desc' ? 'Price ↓' : 'Sort price';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <div className="text-sm text-slate-500 mb-1">
          <Link to="/shop" className="hover:underline">
            Shop
          </Link>
          {mainCategory && (
            <>
              {' / '}
              <Link to={`/shop/${mainCategory.slug}`} className="hover:underline">
                {mainCategory.name}
              </Link>
            </>
          )}
          {subCategory && (
            <>
              {' / '}
              <span className="text-slate-700">{subCategory.name}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
          <span className="text-sm text-slate-500">
            {loading ? '…' : `${totalCount} product${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>
        {!sort && !county && (
          <p className="mt-1 text-xs text-slate-500">Featured products appear first.</p>
        )}
        {county && (
          <p className="mt-1 text-xs text-slate-500">
            Showing sellers who serve {county}
            {proximity || sort === 'nearby' ? ' · nearer listings first' : ''}.
            {' '}
            <Link
              to={`/shop/in/${countyNameToSlug(county)}${categorySlug ? `/${categorySlug}` : ''}`}
              className="text-brand-700 hover:underline"
            >
              County page
            </Link>
          </p>
        )}
        {pulse && !pulse.insufficient && (
          <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs">
            <span className="badge bg-brand-50 text-brand-800 ring-1 ring-brand-200">
              {pulse.count} local listings
            </span>
            {heatLabel(pulse.heat) && (
              <span className="badge bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                {heatLabel(pulse.heat)}
              </span>
            )}
            {pulse.median_price != null && (
              <span className="text-slate-500">
                Median ask KSh {Number(pulse.median_price).toLocaleString()}
              </span>
            )}
          </div>
        )}
        {pulse?.insufficient && county && (
          <p className="mt-2 text-xs text-slate-500">
            Not enough local data yet for a market pulse in {county}.
          </p>
        )}
      </div>

      {/* Main categories when browsing all products */}
      {!showSubTabs && (
        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 mb-4">
          <div role="tablist" aria-label="Main categories" className="flex flex-wrap gap-2">
            <CategoryChip
              to="/shop"
              active={!categorySlug}
              icon={categoryIcon('all')}
              label="All"
            />
            {tree.map((c) => (
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
      )}

      {/* Subcategory tabs when inside a main category */}
      {showSubTabs && (
        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 mb-4">
          <div role="tablist" aria-label="Subcategories" className="flex flex-wrap gap-2">
            <CategoryChip
              to={`/shop/${mainCategory.slug}`}
              active={!subCategory}
              icon={categoryIcon('all')}
              label="All"
            />
            {subTabs.map((c) => (
              <CategoryChip
                key={c.id}
                to={`/shop/${c.slug}`}
                active={subCategory?.slug === c.slug}
                icon={categoryIcon(c.slug || c.name)}
                label={c.name}
                count={c.product_count}
              />
            ))}
          </div>
        </div>
      )}

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
            {showSubTabs ? (
              <div className="relative flex-1 sm:flex-none">
                <label className="sr-only" htmlFor="shop-sub-select">
                  Subcategory
                </label>
                <select
                  id="shop-sub-select"
                  value={subCategory?.slug || ''}
                  onChange={(e) => onSubChange(e.target.value)}
                  className="input py-2.5 pr-9 appearance-none bg-slate-50 border-slate-200 focus:bg-white cursor-pointer min-w-[160px]"
                >
                  <option value="">All in {mainCategory.name}</option>
                  {subTabs.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="relative flex-1 sm:flex-none">
                <label className="sr-only" htmlFor="shop-main-select">
                  Category
                </label>
                <select
                  id="shop-main-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) navigate(`/shop/${e.target.value}`);
                  }}
                  className="input py-2.5 pr-9 appearance-none bg-slate-50 border-slate-200 focus:bg-white cursor-pointer min-w-[160px]"
                >
                  <option value="">All Categories</option>
                  {tree.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <label className="sr-only" htmlFor="shop-county">
              County
            </label>
            <select
              id="shop-county"
              value={county}
              onChange={(e) => setCountyFilter(e.target.value)}
              className="input py-2.5 appearance-none bg-slate-50 border-slate-200 focus:bg-white cursor-pointer w-full"
            >
              <option value="">All counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={toggleCorridor}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider ring-1 transition-colors ${
              corridor
                ? 'bg-brand-50 text-brand-700 ring-brand-300'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
            aria-pressed={corridor}
          >
            Corridor
          </button>

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

      <ProductListingGrid
        products={products}
        loading={loading}
        adContext={{ categorySlug, search }}
        emptyState={
          <div className="card p-10 text-center">
            <div className="text-4xl mb-2" aria-hidden="true">
              🔍
            </div>
            <div className="text-slate-700 font-semibold">No products found</div>
            <div className="text-sm text-slate-500 mt-1">
              Try a different subcategory or clear your search.
            </div>
            {hasActiveFilters && (
              <button onClick={reset} className="btn-outline mt-4 text-sm">
                Reset filters
              </button>
            )}
          </div>
        }
      />
    </div>
  );
}
