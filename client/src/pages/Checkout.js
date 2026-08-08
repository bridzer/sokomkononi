import React, { useEffect, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { cartWhatsAppMessage, formatKsh, PHONE_NUMBERS } from '../utils/format';
import { formatProductPrice } from '../utils/pricing';
import { deliveryLabel } from '../utils/delivery';
import {
  DELIVERY_METHODS,
  FRAUD_NOTICE,
  INSURANCE_COPY,
  REFUND_POLICY,
  fulfillmentLabel,
  groupCartByFulfillment,
  isPlatformFulfilled,
} from '../utils/commerce';
import api from '../api/client';
import WhatsAppButton from '../components/WhatsAppButton';
import AddressFields from '../components/AddressFields';
import { trackBeginCheckout, trackPurchase } from '../utils/analytics';
import {
  EMPTY_ADDRESS,
  composeDeliveryAddress,
  validateDeliveryAddress,
} from '../utils/address';

export default function Checkout() {
  const {
    items,
    total,
    clear,
    deliveryMethod,
    setDeliveryMethod,
    paymentMethodPref,
    setPaymentMethodPref,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([{ id: 'cod', label: 'Pay on delivery' }]);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethodPref || 'cod');
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
    address: { ...EMPTY_ADDRESS },
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
    api
      .get('/payments/options')
      .then((r) => {
        const methods = r.data.methods || [{ id: 'cod', label: 'Pay on delivery' }];
        setPaymentMethods(methods);
        const preferred = methods.some((m) => m.id === paymentMethodPref)
          ? paymentMethodPref
          : methods[0].id;
        setPaymentMethod(preferred);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items, total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary mt-4">Browse shop</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 text-brand-700 grid place-items-center mb-4">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a6 6 0 0112 0v1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to checkout</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Create an account or log in so we can assign your order and you can track delivery.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {items.length} item{items.length === 1 ? '' : 's'} · {formatKsh(total)}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" state={{ from: '/checkout' }} className="btn-primary">
              Log in
            </Link>
            <Link to="/register" state={{ from: '/checkout' }} className="btn-outline">
              Create account
            </Link>
          </div>
          <Link to="/cart" className="inline-block mt-4 text-sm text-slate-500 hover:text-brand-700">
            ← Back to cart
          </Link>
        </div>
      </div>
    );
  }

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const { platform, seller } = groupCartByFulfillment(items);
  const needsAddress = deliveryMethod === 'soko_delivery';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone) {
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
    setSubmitting(true);
    try {
      setPaymentMethodPref(paymentMethod);
      const address = form.address || EMPTY_ADDRESS;
      const payload = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        notes: form.notes,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        ...address,
        delivery_address: composeDeliveryAddress(address),
        county: address.county || '',
      };
      const { data } = await api.post('/orders', payload);

      trackPurchase(data.order);

      if (paymentMethod === 'loop' && data.payment) {
        toast.success(data.payment.customerMessage || 'Check your phone to complete payment');
      } else {
        toast.success('Order placed!');
      }

      clear();
      const orderNumber = data.order.order_number;
      const viewToken = data.order.view_token;
      const qs = viewToken ? `?t=${encodeURIComponent(viewToken)}` : '';
      navigate(`/order-success/${orderNumber}${qs}`, {
        state: { order: data.order, payment: data.payment, viewToken },
      });
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Please log in again to place your order');
        navigate('/login', { state: { from: '/checkout' } });
        return;
      }
      toast.error(err.response?.data?.error || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  const waMessage = cartWhatsAppMessage(items, total, {
    name: form.customer_name,
    phone: form.customer_phone,
    delivery_address: composeDeliveryAddress(form.address),
    ...form.address,
  });

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Secure checkout
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Complete your order</h1>
          <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            {['Cart', 'Shipping', 'Payment', 'Confirm'].map((step, i) => (
              <li
                key={step}
                className={`px-2.5 py-1 rounded-full ${
                  i >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <form className="space-y-5" onSubmit={submit}>
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-slate-900 text-lg">Contact</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full name *</label>
                  <input
                    className="input"
                    value={form.customer_name}
                    onChange={(e) => setField('customer_name', e.target.value)}
                    required
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
                  />
                </div>
              </div>
              <div>
                <label className="label">Email (optional)</label>
                <input
                  type="email"
                  className="input"
                  value={form.customer_email}
                  onChange={(e) => setField('customer_email', e.target.value)}
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
                  Tell us any pickup / transport notes below. Full street address is optional for this
                  option.
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

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-slate-900 text-lg">Payment</h2>
              <div className="space-y-2">
                {paymentMethods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === m.id
                        ? 'border-brand-500 bg-brand-50/80 ring-1 ring-brand-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={m.id}
                      checked={paymentMethod === m.id}
                      onChange={() => {
                        setPaymentMethod(m.id);
                        setPaymentMethodPref(m.id);
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-semibold text-slate-900 block">{m.label}</span>
                      {m.description ? (
                        <span className="text-sm text-slate-600">{m.description}</span>
                      ) : null}
                      {m.id === 'loop' || m.id === 'cod' ? (
                        <span className="block text-xs text-brand-700 mt-1 font-medium">
                          Covered by Soko Mkononi refund policy when paid via our checkout
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>

              {paymentMethod === 'loop' ? (
                <p className="text-xs text-slate-600">
                  You will receive a Loop payment prompt on{' '}
                  <strong>{form.customer_phone || 'your phone'}</strong>. Complete payment to confirm
                  your order.
                </p>
              ) : null}

              <div className="rounded-xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-xs text-rose-900 leading-relaxed">
                <strong>Fraud notice: </strong>
                {FRAUD_NOTICE}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Refund policy: </strong>
                {REFUND_POLICY}
              </div>
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="btn-primary flex-1 py-3 text-base shadow-md" type="submit" disabled={submitting}>
                {submitting
                  ? 'Processing…'
                  : paymentMethod === 'loop'
                  ? 'Place order & pay with Loop'
                  : 'Place order securely'}
              </button>
              <WhatsAppButton
                message={waMessage}
                className="btn-whatsapp flex-1 py-3"
                placement="top-end"
              >
                Order via WhatsApp
              </WhatsAppButton>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              By placing this order you agree to our{' '}
              <Link to="/terms" className="text-brand-700 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-brand-700 hover:underline">Privacy Policy</Link>
              . Estimated delivery: <strong>{deliveryLabel()}</strong>. Signed in as{' '}
              <strong>{user.name}</strong>.
            </p>
          </form>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-md p-5 h-fit lg:sticky lg:top-20">
            <h2 className="font-bold text-slate-900 mb-1">Your order</h2>
            <p className="text-xs text-slate-500 mb-3">
              {DELIVERY_METHODS.find((m) => m.id === deliveryMethod)?.short || 'Delivery'} ·{' '}
              <span className="font-semibold text-slate-700">{deliveryLabel()}</span>
            </p>
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
            <div className="border-t border-slate-100 mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>{formatKsh(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Delivery</span>
                <span className="text-brand-700 font-medium">
                  {needsAddress ? 'Free · assured' : 'Arrange with you'}
                </span>
              </div>
              <div className="flex justify-between text-base pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-extrabold text-xl text-brand-700">{formatKsh(total)}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Need help? Call{' '}
              {PHONE_NUMBERS.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 && <span className="text-slate-400"> or </span>}
                  <a href={`tel:${p.intl}`} className="text-brand-700 font-semibold">
                    {p.display}
                  </a>
                </Fragment>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
