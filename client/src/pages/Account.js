import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatKsh } from '../utils/format';
import { deliveryLabel } from '../utils/delivery';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'delivered'];

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function OrderTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-lg bg-red-50 text-red-700 text-sm font-medium px-3 py-2">
        Order cancelled
      </div>
    );
  }
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-1">
      {STATUS_STEPS.map((step, i) => {
        const done = idx >= i;
        return (
          <li key={step} className="text-center">
            <div
              className={`h-1.5 rounded-full ${done ? 'bg-brand-600' : 'bg-slate-200'}`}
            />
            <div
              className={`mt-1.5 text-[10px] sm:text-xs font-medium ${
                done ? 'text-brand-700' : 'text-slate-400'
              }`}
            >
              {STATUS_LABEL[step]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Account() {
  const { user, logout, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isAdmin) return undefined;
    setLoading(true);
    api
      .get('/orders/mine')
      .then((r) => setOrders(r.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user, isAdmin]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/account' }} />;
  }
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">My account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Signed in as <span className="font-medium text-slate-700">{user.name}</span> ({user.email})
          </p>
        </div>
        <button type="button" className="btn-outline text-sm" onClick={logout}>
          Sign out
        </button>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-800">Order tracking</h2>
      <p className="text-sm text-slate-500">
        Delivery is typically {deliveryLabel()} after confirmation.
      </p>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-6 card p-6 text-center">
          <p className="text-slate-600">No orders linked to this account yet.</p>
          <p className="text-sm text-slate-500 mt-1">
            Place an order while signed in to track it here.
          </p>
          <Link to="/shop" className="btn-primary mt-4 inline-flex">
            Browse shop
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800">{o.order_number}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(o.created_at).toLocaleString('en-KE')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-brand-700">{formatKsh(o.total_amount)}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    Payment: {o.payment_status}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <OrderTracker status={o.status} />
              </div>

              <ul className="mt-3 text-sm text-slate-700 space-y-1">
                {(o.items || []).map((it, i) => (
                  <li key={i}>
                    {it.quantity}× {it.product_name}
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs text-slate-500">
                Est. delivery: {o.delivery_label || deliveryLabel()}
                {o.county ? ` · ${o.county}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
