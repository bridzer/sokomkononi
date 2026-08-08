import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatKsh } from '../utils/format';
import { formatProductPrice } from '../utils/pricing';
import {
  DELIVERY_METHODS,
  INSURANCE_COPY,
  fulfillmentLabel,
  groupCartByFulfillment,
  isPlatformFulfilled,
} from '../utils/commerce';
import AddressFields from '../components/AddressFields';
import CheckoutStepper from '../components/CheckoutStepper';
import { trackBeginCheckout } from '../utils/analytics';
import { validateDeliveryAddress } from '../utils/address';
import {
  draftToAuthPrefill,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from '../utils/checkoutDraft';

/** Step 2: contact + shipping. Auth happens next if needed, then payment. */
export default function Checkout() {
  const {
    items,
    total,
    deliveryMethod,
    setDeliveryMethod,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const draft = loadCheckoutDraft();
    return {
      customer_name: draft.customer_name,
      customer_phone: draft.customer_phone,
      customer_email: draft.customer_email,
      notes: draft.notes,
      address: draft.address,
    };
  });

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || user.name || '',
      customer_email: f.customer_email || user.email || '',
      customer_phone: f.customer_phone || user.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    if (items.length > 0) trackBeginCheckout(items, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary mt-4">
          Browse shop
        </Link>
      </div>
    );
  }

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const { platform, seller } = groupCartByFulfillment(items);
  const needsAddress = deliveryMethod === 'soko_delivery';

  const continueNext = (e) => {
    e.preventDefault();
    if (!form.customer_name?.trim() || !form.customer_phone?.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    if (needsAddress) {
      const addrError = validateDeliveryAddress(form.address, { required: true });
      if (addrError) {
        toast.error(addrError);
        return;
      }
    }
    const draft = saveCheckoutDraft({
      ...form,
      delivery_method: deliveryMethod,
    });
    const prefill = draftToAuthPrefill(draft);

    if (user) {
      navigate('/checkout/payment');
      return;
    }
    navigate('/checkout/account', { state: { prefill, from: '/checkout/payment' } });
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Secure checkout
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Contact & shipping
          </h1>
          <CheckoutStepper current="shipping" skipAccount={Boolean(user)} />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <form className="space-y-5" onSubmit={continueNext}>
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-slate-900 text-lg">Contact</h2>
              <p className="text-sm text-slate-500 -mt-2">
                We&apos;ll use this to confirm delivery
                {!user ? ' and to set up your account' : ''}.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full name *</label>
                  <input
                    className="input"
                    value={form.customer_name}
                    onChange={(e) => setField('customer_name', e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input
                    className="input"
                    value={form.customer_phone}
                    onChange={(e) => setField('customer_phone', e.target.value)}
                    placeholder="07XX XXX XXX"
                    required
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div>
                <label className="label">
                  Email {!user ? '*' : '(optional)'}
                </label>
                <input
                  type="email"
                  className="input"
                  value={form.customer_email}
                  onChange={(e) => setField('customer_email', e.target.value)}
                  required={!user}
                  autoComplete="email"
                  placeholder={!user ? 'Needed to create or sign in to your account' : ''}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-slate-900 text-lg">Shipping</h2>

              {(platform.length > 0 || seller.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {platform.length > 0 && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
                      <div className="font-semibold text-emerald-900">
                        Soko Mkononi fulfilment ({platform.length})
                      </div>
                      <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed">
                        {INSURANCE_COPY.platform}
                      </p>
                    </div>
                  )}
                  {seller.length > 0 && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3">
                      <div className="font-semibold text-amber-950">
                        Seller fulfilment ({seller.length})
                      </div>
                      <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                        {INSURANCE_COPY.external}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {DELIVERY_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryMethod === m.id
                        ? 'border-brand-500 bg-brand-50/80 ring-1 ring-brand-300'
                        : 'border-slate-200 hover:border-slate-300'
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
                      <span className="text-sm text-slate-600">{m.description}</span>
                    </span>
                  </label>
                ))}
              </div>

              {needsAddress ? (
                <AddressFields
                  value={form.address}
                  onChange={(address) => setField('address', address)}
                  required
                />
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  Full street address is optional for this option. Add pickup / transport notes below.
                </div>
              )}

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Preferred date, pickup point, transporter details…"
                />
              </div>
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/cart" className="btn-ghost flex-1 py-3 text-center">
                ← Back to cart
              </Link>
              <button className="btn-primary flex-1 py-3 text-base shadow-md" type="submit">
                {user ? 'Continue to payment' : 'Continue · sign in next'}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-md p-5 h-fit lg:sticky lg:top-20">
            <h2 className="font-bold text-slate-900 mb-3">Your order</h2>
            <div className="space-y-3 max-h-72 overflow-auto pr-1">
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between text-sm gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{i.name}</div>
                    <div className="text-slate-500">
                      {i.quantity} × {formatProductPrice(i)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold mt-0.5 ${
                        isPlatformFulfilled(i) ? 'text-emerald-700' : 'text-amber-800'
                      }`}
                    >
                      {fulfillmentLabel(i)}
                    </div>
                  </div>
                  <div className="font-semibold shrink-0">{formatKsh(i.price * i.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-extrabold text-xl text-brand-700">{formatKsh(total)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
