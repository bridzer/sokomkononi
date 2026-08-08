import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatKsh } from '../utils/format';
import { formatProductPrice } from '../utils/pricing';
import {
  fulfillmentLabel,
  isPlatformFulfilled,
} from '../utils/commerce';
import SafeImage, { DEFAULT_FALLBACK } from '../components/SafeImage';
import CartRelatedProducts from '../components/CartRelatedProducts';
import CheckoutStepper from '../components/CheckoutStepper';

export default function Cart() {
  const { items, updateQty, removeItem, total, clear, deliveryMethod } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Browse fresh farm listings and add products to start checkout.
        </p>
        <Link to="/shop" className="btn-primary mt-6">
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Almost yours
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Your cart</h1>
            <CheckoutStepper current="cart" />
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-sm text-slate-500 hover:text-red-600"
          >
            Clear cart
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-6">
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

            <CartRelatedProducts items={items} />
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-md p-5 h-fit lg:sticky lg:top-20">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Order summary</h2>
            <div className="flex justify-between text-sm py-1">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatKsh(total)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-slate-600">Items</span>
              <span className="font-medium">
                {items.reduce((n, i) => n + i.quantity, 0)}
              </span>
            </div>
            <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between items-baseline">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-extrabold text-2xl text-brand-700">{formatKsh(total)}</span>
            </div>
            <Link to="/checkout" className="btn-primary w-full mt-5 py-3 text-base shadow-md">
              Continue to shipping
            </Link>
            <Link to="/shop" className="btn-ghost w-full mt-2">
              Continue shopping
            </Link>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed text-center">
              Next: contact details & delivery
              {deliveryMethod === 'soko_delivery' ? ' · insured delivery available' : ''}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
