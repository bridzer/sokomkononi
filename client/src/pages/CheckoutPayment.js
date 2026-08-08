import React, { Fragment, useEffect, useState } from 'react';
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
  REFUND_POLICY,
  fulfillmentLabel,
  isPlatformFulfilled,
} from '../utils/commerce';
import api from '../api/client';
import WhatsAppButton from '../components/WhatsAppButton';
import CheckoutStepper from '../components/CheckoutStepper';
import AddressDisplay from '../components/AddressDisplay';
import { trackPurchase } from '../utils/analytics';
import { EMPTY_ADDRESS, composeDeliveryAddress } from '../utils/address';
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
} from '../utils/checkoutDraft';

/** Final step: payment method + place order (requires login). */
export default function CheckoutPayment() {
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
  const [draft] = useState(() => loadCheckoutDraft());

  useEffect(() => {
    if (!user) {
      navigate('/checkout/account', { replace: true });
      return;
    }
    if (!draft.customer_name || !draft.customer_phone) {
      toast.error('Please complete contact & shipping first');
      navigate('/checkout', { replace: true });
    }
  }, [user, draft, navigate]);

  useEffect(() => {
    if (draft.delivery_method && draft.delivery_method !== deliveryMethod) {
      setDeliveryMethod(draft.delivery_method);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (!user) return null;

  const address = draft.address || EMPTY_ADDRESS;
  const needsAddress = (draft.delivery_method || deliveryMethod) === 'soko_delivery';

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      setPaymentMethodPref(paymentMethod);
      const method = draft.delivery_method || deliveryMethod;
      const payload = {
        customer_name: draft.customer_name,
        customer_phone: draft.customer_phone,
        customer_email: draft.customer_email || user.email || '',
        notes: draft.notes,
        payment_method: paymentMethod,
        delivery_method: method,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        ...address,
        delivery_address: composeDeliveryAddress(address),
        county: address.county || '',
      };
      const { data } = await api.post('/orders', payload);

      trackPurchase(data.order);
      clearCheckoutDraft();

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
        navigate('/checkout/account');
        return;
      }
      toast.error(err.response?.data?.error || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  const waMessage = cartWhatsAppMessage(items, total, {
    name: draft.customer_name,
    phone: draft.customer_phone,
    delivery_address: composeDeliveryAddress(address),
    ...address,
  });

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Secure checkout
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Payment</h1>
          <CheckoutStepper current="payment" skipAccount />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <form className="space-y-5" onSubmit={submit}>
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-bold text-slate-900 text-lg">Delivery details</h2>
                <Link to="/checkout" className="text-sm font-semibold text-brand-700 hover:underline">
                  Edit
                </Link>
              </div>
              <div className="text-sm text-slate-700 space-y-1">
                <div>
                  <span className="text-slate-500">Name:</span> {draft.customer_name}
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span> {draft.customer_phone}
                </div>
                {draft.customer_email ? (
                  <div>
                    <span className="text-slate-500">Email:</span> {draft.customer_email}
                  </div>
                ) : null}
                <div>
                  <span className="text-slate-500">Method:</span>{' '}
                  {DELIVERY_METHODS.find((m) => m.id === (draft.delivery_method || deliveryMethod))
                    ?.label || 'Delivery'}
                </div>
              </div>
              {needsAddress || draft.address?.address_line1 || draft.address?.county ? (
                <div className="pt-2 border-t border-slate-100">
                  <AddressDisplay address={draft.address} />
                </div>
              ) : null}
              {draft.notes ? (
                <p className="text-sm text-slate-600 pt-1">
                  <span className="text-slate-500">Notes:</span> {draft.notes}
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-slate-900 text-lg">Payment method</h2>
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
                  <strong>{draft.customer_phone || 'your phone'}</strong>. Complete payment to
                  confirm your order.
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
              <button
                className="btn-primary flex-1 py-3 text-base shadow-md"
                type="submit"
                disabled={submitting}
              >
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
              <Link to="/terms" className="text-brand-700 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-brand-700 hover:underline">
                Privacy Policy
              </Link>
              . Estimated delivery: <strong>{deliveryLabel()}</strong>. Signed in as{' '}
              <strong>{user.name}</strong>.
            </p>
          </form>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-md p-5 h-fit lg:sticky lg:top-20">
            <h2 className="font-bold text-slate-900 mb-1">Your order</h2>
            <p className="text-xs text-slate-500 mb-3">
              {DELIVERY_METHODS.find((m) => m.id === (draft.delivery_method || deliveryMethod))
                ?.short || 'Delivery'}{' '}
              · <span className="font-semibold text-slate-700">{deliveryLabel()}</span>
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
