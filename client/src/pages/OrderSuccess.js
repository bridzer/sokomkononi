import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { cartWhatsAppMessage, formatKsh } from '../utils/format';
import WhatsAppButton from '../components/WhatsAppButton';
import PhoneButton from '../components/PhoneButton';
import { deliveryLabel } from '../utils/delivery';
import { useAuth } from '../context/AuthContext';

const PAYMENT_LABELS = {
  cod: 'Pay on delivery',
  loop: 'Loop',
  unpaid: 'Unpaid',
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
};

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const viewToken =
    location.state?.viewToken ||
    location.state?.order?.view_token ||
    searchParams.get('t') ||
    '';
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const initialPayment = location.state?.payment;

  useEffect(() => {
    if (order) return;
    const params = viewToken ? { t: viewToken } : {};
    api
      .get(`/orders/lookup/${orderNumber}`, { params })
      .then((r) => setOrder(r.data.order))
      .finally(() => setLoading(false));
  }, [orderNumber, order, viewToken]);

  // Poll Loop payment status while pending
  useEffect(() => {
    if (!order || order.payment_method !== 'loop' || order.payment_status === 'paid') {
      return undefined;
    }
    if (order.payment_status !== 'pending') return undefined;

    const poll = () => {
      const params = viewToken ? { t: viewToken } : {};
      api.get(`/payments/loop/status/${order.order_number}`, { params }).then((r) => {
        const next = r.data;
        if (next.payment_status !== order.payment_status) {
          setOrder((o) => ({ ...o, payment_status: next.payment_status, status: next.order_status }));
        }
      }).catch(() => {});
    };

    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [order, viewToken]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">Loading…</div>;
  }
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-slate-500 mb-4">Order not found.</div>
        <Link to="/shop" className="btn-primary">Back to shop</Link>
      </div>
    );
  }

  const items = (order.items || []).map((it) => ({
    name: it.product_name,
    quantity: it.quantity,
    price: Number(it.unit_price),
  }));
  const waMessage = cartWhatsAppMessage(items, order.total_amount, {
    name: order.customer_name,
    phone: order.customer_phone,
    delivery_address: order.delivery_address,
    county: order.county,
    order_number: order.order_number,
  });

  const isLoopPending = order.payment_method === 'loop' && order.payment_status === 'pending';
  const isLoopPaid = order.payment_method === 'loop' && order.payment_status === 'paid';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="card p-8 text-center">
        <div className={`mx-auto w-14 h-14 rounded-full grid place-items-center mb-4 ${
          isLoopPending ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'
        }`}>
          {isLoopPending ? (
            <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isLoopPending ? 'Complete payment on your phone' : 'Thank you for your order!'}
        </h1>
        <p className="text-slate-600 mt-2">
          Your order <span className="font-semibold text-brand-700">{order.order_number}</span> has been received.
          {isLoopPending ? (
            <>
              {' '}
              {initialPayment?.customerMessage ||
                'Approve the Loop payment prompt on your phone to confirm this order.'}
            </>
          ) : (
            <>
              {' '}
              We will contact you shortly on{' '}
              <span className="font-medium">{order.customer_phone}</span> to confirm delivery.
            </>
          )}
        </p>

        {(order.payment_method || order.payment_status) && (
          <div className="mt-4 inline-flex flex-wrap gap-2 justify-center text-xs">
            {order.payment_method ? (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {PAYMENT_LABELS[order.payment_method] || order.payment_method}
              </span>
            ) : null}
            {order.payment_status ? (
              <span className={`px-2.5 py-1 rounded-full ${
                order.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : order.payment_status === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : order.payment_status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {PAYMENT_LABELS[order.payment_status] || order.payment_status}
              </span>
            ) : null}
          </div>
        )}

        {isLoopPaid ? (
          <p className="text-sm text-brand-700 mt-3 font-medium">Payment received — thank you!</p>
        ) : null}

        <div className="mt-6 text-left">
          <h2 className="font-semibold text-slate-800">Order details</h2>
          <div className="mt-2 space-y-2">
            {order.items?.map((it) => (
              <div key={it.id || `${it.product_name}-${it.quantity}`} className="flex justify-between text-sm border-b border-slate-100 py-1">
                <span>
                  {it.product_name} × {it.quantity}
                </span>
                <span>{formatKsh(it.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2">
              <span>Total</span>
              <span className="text-brand-700">{formatKsh(order.total_amount)}</span>
            </div>
            <p className="text-sm text-slate-600 pt-2">
              Estimated delivery:{' '}
              <span className="font-semibold text-slate-800">
                {order.delivery_label || deliveryLabel()}
              </span>
            </p>
            <p className="text-xs text-slate-500 capitalize">
              Status: {order.status}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <WhatsAppButton message={waMessage} className="btn-whatsapp" placement="top-center">
            Confirm on WhatsApp
          </WhatsAppButton>
          <PhoneButton className="btn-outline" placement="top-center">
            Call our team
          </PhoneButton>
          {user?.role === 'customer' ? (
            <Link to="/account" className="btn-primary">
              Track in My account
            </Link>
          ) : (
            <Link to="/register" className="btn-outline">
              Create account to track
            </Link>
          )}
          <Link to="/shop" className="btn-ghost">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
