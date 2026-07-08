import React, { useEffect, useMemo, useState, Fragment } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { formatKsh, orderWhatsAppMessage, PHONE_NUMBERS } from '../utils/format';
import { useCart } from '../context/CartContext';
import WhatsAppButton from '../components/WhatsAppButton';
import SafeImage, { DEFAULT_FALLBACK } from '../components/SafeImage';

const FALLBACK_IMG = DEFAULT_FALLBACK;

// Merge legacy image_url + gallery into a single ordered list of URLs, keeping
// the cover first and removing duplicates. Falls back to a stock image so the
// UI never renders an empty gallery.
function collectImages(product) {
  const list = [];
  const seen = new Set();
  const push = (u) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    list.push(u);
  };
  push(product?.image_url);
  if (Array.isArray(product?.images)) product.images.forEach(push);
  if (!list.length) list.push(FALLBACK_IMG);
  return list;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setActiveIdx(0);
    api
      .get(`/products/${slug}`)
      .then((r) => setProduct(r.data.product))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const images = useMemo(() => collectImages(product), [product]);
  const hasGallery = images.length > 1;
  const activeImage = images[Math.min(activeIdx, images.length - 1)] || images[0];

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">Loading…</div>;
  }
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-slate-500 mb-4">Product not found.</div>
        <Link to="/shop" className="btn-primary">Back to shop</Link>
      </div>
    );
  }

  const buyNow = () => {
    addItem(product, qty);
    navigate('/cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">Home</Link> /{' '}
        <Link to="/shop" className="hover:underline">Shop</Link>
        {product.category_slug && (
          <>
            {' '}
            / <Link to={`/shop/${product.category_slug}`} className="hover:underline">
              {product.category_name}
            </Link>
          </>
        )}
        {' '}/ <span className="text-slate-700">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* --- Gallery --- */}
        <div>
          <div className="rounded-xl overflow-hidden bg-slate-100 aspect-[4/3] relative group">
            <SafeImage
              key={activeImage}
              src={activeImage}
              fallback={FALLBACK_IMG}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {hasGallery && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() =>
                    setActiveIdx((i) => (i - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow grid place-items-center text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setActiveIdx((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow grid place-items-center text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-2 right-2 text-xs font-medium bg-black/60 text-white rounded-full px-2 py-0.5">
                  {activeIdx + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {hasGallery && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
              {images.map((url, idx) => {
                const active = idx === activeIdx;
                return (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    aria-label={`Show image ${idx + 1}`}
                    aria-pressed={active}
                    className={`snap-start shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-slate-100 transition-all ${
                      active
                        ? 'ring-2 ring-brand-600 ring-offset-2 ring-offset-white'
                        : 'opacity-70 hover:opacity-100 ring-1 ring-slate-200'
                    }`}
                  >
                    <SafeImage src={url} fallback={FALLBACK_IMG} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          {product.category_name && (
            <span className="text-xs uppercase tracking-wider text-brand-700 font-semibold">
              {product.category_name}
            </span>
          )}
          <h1 className="text-3xl font-bold text-slate-800 mt-1">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-3xl font-extrabold text-brand-700">
              {formatKsh(product.price)}
            </div>
            <span className="text-sm text-slate-500">{product.unit}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {product.breed && (
              <div className="card p-3">
                <div className="text-slate-500 text-xs">Breed</div>
                <div className="font-medium">{product.breed}</div>
              </div>
            )}
            {product.age_stage && (
              <div className="card p-3">
                <div className="text-slate-500 text-xs">Age / Stage</div>
                <div className="font-medium">{product.age_stage}</div>
              </div>
            )}
            <div className="card p-3">
              <div className="text-slate-500 text-xs">Availability</div>
              <div className={`font-medium ${product.stock > 0 ? 'text-brand-700' : 'text-red-600'}`}>
                {product.stock > 0 ? `In stock (${product.stock})` : 'Out of stock'}
              </div>
            </div>
            <div className="card p-3">
              <div className="text-slate-500 text-xs">Delivery</div>
              <div className="font-medium">Free countrywide</div>
            </div>
          </div>

          {product.description && (
            <p className="mt-4 text-slate-700 leading-relaxed">{product.description}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-slate-300 rounded-lg">
              <button
                className="px-3 py-2 text-slate-600"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 text-center border-x border-slate-300 py-2 outline-none"
              />
              <button className="px-3 py-2 text-slate-600" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <button
              onClick={() => addItem(product, qty)}
              disabled={product.stock === 0}
              className="btn-outline flex-1 disabled:opacity-50"
            >
              Add to cart
            </button>
            <button
              onClick={buyNow}
              disabled={product.stock === 0}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Buy now
            </button>
          </div>

          <WhatsAppButton
            message={orderWhatsAppMessage(product)}
            className="btn-whatsapp w-full mt-3"
            placement="top-start"
          >
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor">
              <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5z" />
            </svg>
            Order via WhatsApp
          </WhatsAppButton>

          <div className="mt-4 text-sm text-slate-600">
            Prefer to call? Dial{' '}
            {PHONE_NUMBERS.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && <span className="text-slate-400"> or </span>}
                <a href={`tel:${p.intl}`} className="text-brand-700 font-semibold">
                  {p.display}
                </a>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
