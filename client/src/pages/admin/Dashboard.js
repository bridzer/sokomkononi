import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { formatKsh } from '../../utils/format';

function Stat({ label, value, hint, color = 'brand' }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 text-${color}-700`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

const statusColor = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data));
  }, []);

  if (!stats) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Products" value={stats.counts.products} />
        <Stat label="Categories" value={stats.counts.categories} />
        <Stat label="Orders" value={stats.counts.orders} hint={`${stats.counts.pendingOrders} pending`} />
        <Stat label="Revenue" value={formatKsh(stats.revenue)} />
        <Stat label="Unread Messages" value={stats.counts.unreadMessages} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="card">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentOrders.length === 0 && (
              <div className="p-6 text-sm text-slate-500">No orders yet.</div>
            )}
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-slate-800">{o.customer_name}</div>
                  <div className="text-slate-500 text-xs">{o.order_number}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-brand-700">{formatKsh(o.total_amount)}</div>
                  <span className={`badge ${statusColor[o.status] || 'bg-slate-100 text-slate-700'} mt-1`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Low stock</h2>
            <Link to="/admin/products" className="text-sm text-brand-700 hover:underline">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.lowStock.length === 0 && (
              <div className="p-6 text-sm text-slate-500">No low stock items.</div>
            )}
            {stats.lowStock.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between text-sm">
                <div className="text-slate-800">{p.name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-red-600 font-semibold">{p.stock} left</span>
                  <span className="text-slate-500">{formatKsh(p.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
