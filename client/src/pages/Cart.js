import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatKsh } from '../utils/format';
import { formatProductPrice } from '../utils/pricing';
import {
  DELIVERY_METHODS,
  FRAUD_NOTICE,
  INSURANCE_COPY,
  REFUND_POLICY,
  fulfillmentLabel,
  groupCartByFulfillment,
  isPlatformFulfilled,
} from '../utils/commerce';
import SafeImage, { DEFAULT_FALLBACK } from '../components/SafeImage';
import api from '../api/client';

export default function Cart() {
  const {
    items,
    updateQty,
    removeItem,
    total,
    clear,
    deliveryMethod,
    setDeliveryMethod,
    paymentMethodPref,
    setPaymentMethodPref,
  } = useCart();
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'cod', label: 'Pay on delivery', description: 'Pay when your order arrives' },
  ]);

  useEffect(() => {
    api
      .get('/payments/options')
      .then((r) => {
        if (r.data.methods?.length) setPaymentMethods(r.data.methods);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center mb-4 text-2xl">
          🛒
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Browse fresh farm listings and add products to start a smooth, insured checkout.
        </p>
        <Link to="/shop" className="btn-primary mt-6">Browse shop</Link>
      </div>
    );
  }

  const { platform, seller } = groupCartByFulfillment(items);
  const needsAddress = deliveryMethod === 'soko_delivery';

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Almost yours</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Your cart</h1>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-sm text-slate-500 hover:text-red-600"
          >
            Clear cart
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {items.map((i) => (
                <div
                  key={i.product_id}
                  className="flex gap-4 p-4 border-b last:border-b-0 border-slate-100"
                >
                  <SafeImage
                    src={i.image_url}
                    fallback={DEFAULT_FALLBACK}
                    alt={i.name}
                    className="w-24 h-24 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{i.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {formatProductPrice(i)} · {i.unit}
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isPlatformFulfilled(i)
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        {fulfillmentLabel(i)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-50"
                          onClick={() => updateQty(i.product_id, i.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="px-3 text-sm font-medium">{i.quantity}</span>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-50"
                          onClick={() => updateQty(i.product_id, i.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline ml-1"
                        onClick={() => removeItem(i.product_id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-900 shrink-0">
                    {formatKsh(i.price * i.quantity)}
                  </div>
                </div>
              ))}
            </section>

            {/* Shipping */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Shipping & delivery</h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose how you want to receive this order. Preferences carry through to checkout.
              </p>

              {(platform.length > 0 || seller.length > 0) && (
                <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                  {platform.length > 0 && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                      <div className="font-semibold text-emerald-900">
                        {platform.length} item{platform.length === 1 ? '' : 's'} · Soko Mkononi
                      </div>
                      <p className="text-emerald-800/90 text-xs mt-1 leading-relaxed">
                        {INSURANCE_COPY.platform}
                      </p>
                    </div>
                  )}
                  {seller.length > 0 && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                      <div className="font-semibold text-amber-950">
                        {seller.length} item{seller.length === 1 ? '' : 's'} · Seller fulfilment
                      </div>
                      <p className="text-amber-900/90 text-xs mt-1 leading-relaxed">
                        {INSURANCE_COPY.external}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2">
                {DELIVERY_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryMethod === m.id
                        ? 'border-brand-500 bg-brand-50/80 ring-1 ring-brand-300 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery_method"
                      className="mt-1"
                      checked={deliveryMethod === m.id}
                      onChange={() => setDeliveryMethod(m.id)}
                    />
                    <span>
                      <span className="font-semibold text-slate-900 block">{m.label}</span>
                      <span className="text-sm text-slate-600 leading-snug">{m.description}</span>
                    </span>
                  </label>
                ))}
              </div>

              {needsAddress ? (
                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-brand-900">
                  Next step: add your structured delivery address at checkout (county → sub-location
                  for Kenya, plus GPS if you allow it) so Soko Mkononi can schedule insured delivery.
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Address is optional for pickup / own transport — we&apos;ll confirm logistics on
                  WhatsApp after you place the order.
                </div>
              )}
            </section>

            {/* Payment preview */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Payment method</h2>
              <p className="text-sm text-slate-500 mt-1">
                Select a preferred method. You can confirm it on the checkout page.
              </p>
              <div className="mt-4 space-y-2">
                {paymentMethods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMethodPref === m.id
                        ? 'border-brand-500 bg-brand-50/80 ring-1 ring-brand-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cart_payment"
                      className="mt-1"
                      checked={paymentMethodPref === m.id}
                      onChange={() => setPaymentMethodPref(m.id)}
                    />
                    <span>
                      <span className="font-semibold text-slate-900 block">{m.label}</span>
                      {m.description ? (
                        <span className="text-sm text-slate-600">{m.description}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-xs text-rose-900 leading-relaxed">
                <strong className="font-semibold">Stay safe. </strong>
                {FRAUD_NOTICE}
              </div>
              <details className="mt-3 group">
                <summary className="text-sm font-semibold text-brand-700 cursor-pointer list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▸</span>
                  Refund policy for Soko Mkononi payments
                </summary>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed pl-4 border-l-2 border-brand-200">
                  {REFUND_POLICY}
                </p>
              </details>
            </section>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-md p-5 h-fit lg:sticky lg:top-20">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Order summary</h2>
            <div className="flex justify-between text-sm py-1">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatKsh(total)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-slate-600">Delivery</span>
              <span className="font-medium text-brand-700">
                {deliveryMethod === 'soko_delivery' ? 'Free · insured' : 'Arranged with you'}
              </span>
            </div>
            <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between items-baseline">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-extrabold text-2xl text-brand-700">{formatKsh(total)}</span>
            </div>
            <Link to="/checkout" className="btn-primary w-full mt-5 py-3 text-base shadow-md">
              Proceed to checkout
            </Link>
            <Link to="/shop" className="btn-ghost w-full mt-2">
              Continue shopping
            </Link>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed text-center">
              Secure checkout · WhatsApp support · Countrywide farm marketplace
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
