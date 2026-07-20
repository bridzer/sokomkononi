import React, { useEffect, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { cartWhatsAppMessage, formatKsh, PHONE_NUMBERS } from '../utils/format';
import { formatProductPrice } from '../utils/pricing';
import api from '../api/client';
import WhatsAppButton from '../components/WhatsAppButton';
import { trackBeginCheckout, trackPurchase } from '../utils/analytics';

const KENYA_COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Uasin Gishu','Kiambu','Machakos','Kajiado',
  'Nyeri','Murang’a','Meru','Embu','Kericho','Bomet','Kakamega','Bungoma','Trans Nzoia',
  'Nandi','Baringo','Laikipia','Narok','Kilifi','Kwale','Taita Taveta','Lamu','Tana River',
  'Garissa','Wajir','Mandera','Isiolo','Marsabit','Samburu','Turkana','West Pokot','Elgeyo Marakwet',
  'Vihiga','Busia','Siaya','Homa Bay','Migori','Kisii','Nyamira','Tharaka Nithi','Kirinyaga',
  'Nyandarua','Makueni','Kitui',
];

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([{ id: 'cod', label: 'Pay on delivery' }]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    county: '',
    notes: '',
  });

  useEffect(() => {
    api
      .get('/payments/options')
      .then((r) => {
        const methods = r.data.methods || [{ id: 'cod', label: 'Pay on delivery' }];
        setPaymentMethods(methods);
        if (methods.some((m) => m.id === 'loop')) {
          // keep cod default unless only loop available
        }
      })
      .catch(() => {});
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

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.delivery_address) {
      toast.error('Name, phone and delivery address are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        payment_method: paymentMethod,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      };
      const { data } = await api.post('/orders', payload);

      trackPurchase(data.order);

      if (paymentMethod === 'loop' && data.payment) {
        toast.success(data.payment.customerMessage || 'Check your phone to complete payment');
      } else {
        toast.success('Order placed!');
      }

      clear();
      navigate(`/order-success/${data.order.order_number}`, {
        state: { order: data.order, payment: data.payment },
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not place order';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const waMessage = cartWhatsAppMessage(items, total, form);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <form className="card p-6 space-y-4" onSubmit={submit}>
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
          <div>
            <label className="label">Delivery address *</label>
            <textarea
              className="input"
              rows={3}
              value={form.delivery_address}
              onChange={(e) => setField('delivery_address', e.target.value)}
              placeholder="Estate / Village / Town, landmark"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">County</label>
              <select
                className="input"
                value={form.county}
                onChange={(e) => setField('county', e.target.value)}
              >
                <option value="">Select county…</option>
                {KENYA_COUNTIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Preferred delivery date, special instructions…"
            />
          </div>

          <div>
            <span className="label">Payment method *</span>
            <div className="space-y-2 mt-1">
              {paymentMethods.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === m.id
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-slate-800 block">{m.label}</span>
                    {m.description ? (
                      <span className="text-sm text-slate-500">{m.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
            {paymentMethod === 'loop' ? (
              <p className="text-xs text-slate-500 mt-2">
                You will receive a Loop payment prompt on{' '}
                <strong>{form.customer_phone || 'your phone'}</strong>. Complete payment to confirm
                your order.
              </p>
            ) : null}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button className="btn-primary flex-1" type="submit" disabled={submitting}>
              {submitting
                ? 'Processing…'
                : paymentMethod === 'loop'
                ? 'Place order & pay with Loop'
                : 'Place order'}
            </button>
            <WhatsAppButton
              message={waMessage}
              className="btn-whatsapp flex-1"
              placement="top-end"
            >
              Order via WhatsApp
            </WhatsAppButton>
          </div>
          <p className="text-xs text-slate-500">
            By placing this order you agree to be contacted by Kalro Farm to confirm details.
            Delivery is free countrywide.
          </p>
        </form>

        <aside className="card p-5 h-fit">
          <h2 className="font-semibold text-slate-800 mb-4">Your order</h2>
          <div className="space-y-3 max-h-72 overflow-auto pr-1">
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-slate-500">
                    {i.quantity} × {formatProductPrice(i)}
                    {i.price_type === 'range' && i.price_max ? (
                      <span className="block text-[11px] text-slate-400">Total uses minimum price</span>
                    ) : null}
                  </div>
                </div>
                <div className="font-medium">{formatKsh(i.price * i.quantity)}</div>
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
              <span className="text-brand-700 font-medium">Free</span>
            </div>
            <div className="flex justify-between text-base pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-brand-700">{formatKsh(total)}</span>
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
  );
}
