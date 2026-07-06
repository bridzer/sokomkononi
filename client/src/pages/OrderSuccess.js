import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../api/client';
import {
  BUSINESS,
  cartWhatsAppMessage,
  formatKsh,
  whatsappUrl,
} from '../utils/format';

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (order) return;
    api
      .get(`/orders/lookup/${orderNumber}`)
      .then((r) => setOrder(r.data.order))
      .finally(() => setLoading(false));
  }, [orderNumber, order]);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="card p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-brand-100 text-brand-700 grid place-items-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Thank you for your order!</h1>
        <p className="text-slate-600 mt-2">
          Your order <span className="font-semibold text-brand-700">{order.order_number}</span> has been received.
          We will contact you shortly on <span className="font-medium">{order.customer_phone}</span> to confirm delivery.
        </p>

        <div className="mt-6 text-left">
          <h2 className="font-semibold text-slate-800">Order details</h2>
          <div className="mt-2 space-y-2">
            {order.items?.map((it) => (
              <div key={it.id} className="flex justify-between text-sm border-b border-slate-100 py-1">
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
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={whatsappUrl(waMessage)}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp"
          >
            Confirm on WhatsApp
          </a>
          <a href={`tel:${BUSINESS.phoneIntl}`} className="btn-outline">
            Call {BUSINESS.phone}
          </a>
          <Link to="/shop" className="btn-ghost">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
