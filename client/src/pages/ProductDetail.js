import React, { useEffect, useMemo, useState, Fragment } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { orderWhatsAppMessage, PHONE_NUMBERS } from '../utils/format';
import { formatProductPrice } from '../utils/pricing';
import { deliveryLabel, getSellerDisplayName } from '../utils/delivery';
import {
  COMMERCE_MODES,
  fulfillmentLabel,
  isEffectivelyFeatured,
  isMarketplaceProduct,
  isPlatformFulfilled,
} from '../utils/commerce';
import { pickScriptForProduct } from '../utils/whatsappScripts';
import { useCart } from '../context/CartContext';
import WhatsAppButton from '../components/WhatsAppButton';
import ProductShareButton from '../components/ProductShareButton';
import BookProductModal from '../components/BookProductModal';
import HoldProductModal from '../components/HoldProductModal';
import ProductReviews from '../components/ProductReviews';
import RelatedProductsRail from '../components/RelatedProductsRail';
import SellerProfileCard from '../components/SellerProfileCard';
import SafeImage, { DEFAULT_FALLBACK } from '../components/SafeImage';
import { buildProductShareText, getProductPageUrl, toAbsoluteUrl } from '../utils/share';
import { trackViewItem } from '../utils/analytics';
import { heatLabel, isReadyForPurchase } from '../utils/proximity';

const FALLBACK_IMG = DEFAULT_FALLBACK;

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
  const [bookOpen, setBookOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [pulse, setPulse] = useState(null);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setActiveIdx(0);
    setQty(1);
    setPulse(null);
    api
      .get(`/products/${slug}`)
      .then((r) => setProduct(r.data.product))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product || !isMarketplaceProduct(product)) return;
    const params = new URLSearchParams();
    if (product.category_slug) params.set('category', product.category_slug);
    if (product.breed) params.set('breed', product.breed);
    if (product.seller?.county) params.set('county', product.seller.county);
    api
      .get(`/market/pulse?${params.toString()}`)
      .then((r) => setPulse(r.data.pulse))
      .catch(() => setPulse(null));
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;

    const prevTitle = document.title;
    document.title = `${product.name} | Soko Mkononi`;

    const pageUrl = getProductPageUrl(product.slug);
    const description = buildProductShareText(product);
    const imageUrl = toAbsoluteUrl(product.image_url);

    const setMeta = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('property', 'og:title', document.title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', pageUrl);
    setMeta('property', 'og:type', 'product');
    if (imageUrl) setMeta('property', 'og:image', imageUrl);
    setMeta('name', 'description', description);
    trackViewItem(product);

    return () => {
      document.title = prevTitle;
    };
  }, [product]);

  const images = useMemo(() => collectImages(product), [product]);
  const hasGallery = images.length > 1;
  const activeImage = images[Math.min(activeIdx, images.length - 1)] || images[0];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-[4/3] rounded-2xl bg-slate-100" />
          <div className="space-y-3">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-8 w-3/4 bg-slate-100 rounded" />
            <div className="h-10 w-40 bg-slate-100 rounded" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
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

  const outOfStock = Number(product.stock) === 0;
  const platformFulfilled = isPlatformFulfilled(product);
  const marketplace = isMarketplaceProduct(product);
  const featured = isEffectivelyFeatured(product);
  const modeMeta = COMMERCE_MODES[marketplace ? 'marketplace' : 'retail'];
  const ready = isReadyForPurchase(product);
  const scarce = marketplace && !outOfStock && Number(product.stock) <= 3;
  const onHold = marketplace && product.lot_status === 'reserved';
  const pickupLabel = product.seller?.pickup_label;

  return (
    <div className="bg-gradient-to-b from-slate-50/80 via-white to-white min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        <nav className="text-sm text-slate-500 mb-5 flex flex-wrap gap-1 items-center">
          <Link to="/" className="hover:text-brand-700">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-brand-700">Shop</Link>
          {product.category_slug && (
            <>
              <span>/</span>
              <Link to={`/shop/${product.category_slug}`} className="hover:text-brand-700">
                {product.category_name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-slate-700 font-medium truncate max-w-[12rem] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] relative group shadow-sm ring-1 ring-slate-200/60">
              <ProductShareButton
                product={product}
                variant="floating"
                analyticsContext="product_detail_gallery"
              />
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md grid place-items-center text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setActiveIdx((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md grid place-items-center text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-3 right-3 text-xs font-medium bg-black/55 text-white rounded-full px-2.5 py-1 backdrop-blur-sm">
                    {activeIdx + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {hasGallery && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 snap-x">
                {images.map((url, idx) => {
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      aria-label={`Show image ${idx + 1}`}
                      aria-pressed={active}
                      className={`snap-start shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 transition-all ${
                        active
                          ? 'ring-2 ring-brand-600 ring-offset-2'
                          : 'opacity-75 hover:opacity-100 ring-1 ring-slate-200'
                      }`}
                    >
                      <SafeImage src={url} fallback={FALLBACK_IMG} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buy box */}
          <div className="lg:sticky lg:top-20 self-start">
            <div className="flex flex-wrap items-center gap-2">
              {product.category_name && (
                <span className="text-xs uppercase tracking-wider text-brand-700 font-semibold">
                  {product.category_name}
                  {product.parent_category_name ? ` · ${product.parent_category_name}` : ''}
                </span>
              )}
              <span
                className={`badge ${
                  marketplace ? 'bg-brand-700 text-white' : 'bg-slate-800 text-white'
                }`}
              >
                {modeMeta.label}
              </span>
              {featured && (
                <span className="badge bg-accent-500 text-white">★ Featured</span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md">{modeMeta.description}</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                {product.name}
              </h1>
              <ProductShareButton
                product={product}
                variant="pill"
                className="shrink-0"
                analyticsContext="product_detail"
              />
            </div>

            <div className="mt-3 flex items-end gap-3 flex-wrap">
              <div className="text-3xl font-extrabold text-brand-700 tracking-tight">
                {formatProductPrice(product)}
              </div>
              <span className="text-sm text-slate-500 pb-1">/ {product.unit}</span>
            </div>

            {pulse && !pulse.insufficient && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {heatLabel(pulse.heat) && (
                  <span className="badge bg-amber-50 text-amber-900 ring-1 ring-amber-200">
                    {heatLabel(pulse.heat)}
                  </span>
                )}
                {pulse.median_price != null && (
                  <span className="text-slate-500">
                    Similar lots median KSh {Number(pulse.median_price).toLocaleString()}
                    {pulse.min_price != null && pulse.max_price != null
                      ? ` (KSh ${Number(pulse.min_price).toLocaleString()}–${Number(pulse.max_price).toLocaleString()})`
                      : ''}
                  </span>
                )}
              </div>
            )}

            {!ready && product.ready_from && (
              <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                Available from {new Date(product.ready_from).toLocaleDateString()} — you can still
                enquire or hold interest.
              </div>
            )}
            {onHold && (
              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                This lot is currently on a soft hold
                {product.reserve_expires_at
                  ? ` until ${new Date(product.reserve_expires_at).toLocaleString()}`
                  : ''}
                .
              </div>
            )}
            {scarce && ready && (
              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900 font-semibold">
                Only {product.stock} left — hold via WhatsApp to avoid missing it.
              </div>
            )}
            {pickupLabel && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">Pickup:</span> {pickupLabel}
                {product.seller?.pickup_notes ? ` — ${product.seller.pickup_notes}` : ''}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-100">
                {fulfillmentLabel(product)}
              </span>
              {platformFulfilled ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                  Delivery assured by Soko Mkononi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-100">
                  Seller fulfilment · assurance available
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Sold by{' '}
              <span className="font-semibold text-slate-800">{getSellerDisplayName(product)}</span>
              {product.seller_location ? (
                <span className="text-slate-500"> · {product.seller_location}</span>
              ) : null}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
              {product.breed && (
                <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
                  <div className="text-slate-500 text-xs">Breed</div>
                  <div className="font-semibold text-slate-800">{product.breed}</div>
                </div>
              )}
              {product.age_stage && (
                <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
                  <div className="text-slate-500 text-xs">Age / Stage</div>
                  <div className="font-semibold text-slate-800">{product.age_stage}</div>
                </div>
              )}
              <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
                <div className="text-slate-500 text-xs">Availability</div>
                <div className={`font-semibold ${outOfStock ? 'text-red-600' : 'text-brand-700'}`}>
                  {outOfStock
                    ? 'Out of stock — book instead'
                    : scarce
                      ? `Only ${product.stock} left`
                      : `In stock (${product.stock})`}
                </div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
                <div className="text-slate-500 text-xs">Delivery window</div>
                <div className="font-semibold text-slate-800">{deliveryLabel()}</div>
              </div>
            </div>

            {product.description && (
              <p className="mt-5 text-slate-700 leading-relaxed text-[15px]">
                {product.description}
              </p>
            )}

            {outOfStock ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This product is currently out of stock. Book your interest and we will contact you
                  on WhatsApp when it is available.
                </div>
                <button
                  type="button"
                  onClick={() => setBookOpen(true)}
                  className="btn-primary w-full bg-amber-600 hover:bg-amber-700"
                >
                  Book this product
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                    <button
                      type="button"
                      className="px-3.5 py-2.5 text-slate-600 hover:bg-slate-50"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.stock}
                      value={qty}
                      onChange={(e) =>
                        setQty(Math.min(product.stock, Math.max(1, Number(e.target.value) || 1)))
                      }
                      className="w-12 text-center border-x border-slate-200 py-2.5 outline-none font-semibold"
                    />
                    <button
                      type="button"
                      className="px-3.5 py-2.5 text-slate-600 hover:bg-slate-50"
                      onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(product, qty)}
                    className="btn-outline flex-1 py-2.5"
                  >
                    Add to cart
                  </button>
                </div>
                <button type="button" onClick={buyNow} className="btn-primary w-full py-3 text-base shadow-md">
                  Buy now — secure checkout
                </button>
                {marketplace && (
                  <button
                    type="button"
                    onClick={() => setHoldOpen(true)}
                    className="btn-outline w-full py-2.5 border-amber-300 text-amber-900 hover:bg-amber-50"
                  >
                    Hold via WhatsApp
                  </button>
                )}
              </div>
            )}

            <WhatsAppButton
              message={
                outOfStock ? pickScriptForProduct(product) : orderWhatsAppMessage(product)
              }
              className="btn-whatsapp w-full mt-3"
              placement="top-start"
              analyticsContext="product_detail"
            >
              {outOfStock ? 'Ask about booking on WhatsApp' : 'Order via WhatsApp'}
            </WhatsAppButton>

            <p className="mt-4 text-sm text-slate-600">
              Prefer to call?{' '}
              {PHONE_NUMBERS.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 && <span className="text-slate-400"> or </span>}
                  <a href={`tel:${p.intl}`} className="text-brand-700 font-semibold">
                    {p.display}
                  </a>
                </Fragment>
              ))}
            </p>
          </div>
        </div>

        <SellerProfileCard product={product} />
        <ProductReviews productId={product.id} />
        <RelatedProductsRail slug={product.slug} />

        <BookProductModal
          product={product}
          open={bookOpen}
          onClose={() => setBookOpen(false)}
        />
        <HoldProductModal
          product={product}
          open={holdOpen}
          onClose={() => setHoldOpen(false)}
        />
      </div>
    </div>
  );
}
