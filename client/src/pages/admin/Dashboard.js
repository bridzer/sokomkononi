import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { formatKsh } from '../../utils/format';
import { formatProductPrice } from '../../utils/pricing';

function Stat({ label, value, hint, colorClass = 'text-brand-700' }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
      {hint && <div className="text-[11px] sm:text-xs text-slate-500 mt-1">{hint}</div>}
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

  if (!stats) return <div className="text-slate-500 py-8 text-center">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 sm:mb-6">Dashboard</h1>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <Stat label="Products" value={stats.counts.products} />
        <Stat label="Categories" value={stats.counts.categories} />
        <Stat label="Orders" value={stats.counts.orders} hint={`${stats.counts.pendingOrders} pending`} />
        <Stat label="Revenue" value={formatKsh(stats.revenue)} />
        <Stat label="Unread" value={stats.counts.unreadMessages} colorClass="text-accent-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4 sm:mt-6">
        <div className="card">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base">Recent orders</h2>
            <Link to="/admin/orders" className="text-xs sm:text-sm text-brand-700 hover:underline shrink-0">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentOrders.length === 0 && (
              <div className="p-6 text-sm text-slate-500 text-center">No orders yet.</div>
            )}
            {stats.recentOrders.map((o) => (
              <div
                key={o.id}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 truncate">{o.customer_name}</div>
                  <div className="text-slate-500 text-xs truncate">{o.order_number}</div>
                </div>
                <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1 shrink-0">
                  <div className="font-semibold text-brand-700">{formatKsh(o.total_amount)}</div>
                  <span className={`badge ${statusColor[o.status] || 'bg-slate-100 text-slate-700'}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base">Low stock</h2>
            <Link to="/admin/products" className="text-xs sm:text-sm text-brand-700 hover:underline shrink-0">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.lowStock.length === 0 && (
              <div className="p-6 text-sm text-slate-500 text-center">No low stock items.</div>
            )}
            {stats.lowStock.map((p) => (
              <div
                key={p.id}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
              >
                <div className="text-slate-800 line-clamp-2">{p.name}</div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-red-600 font-semibold">{p.stock} left</span>
                  <span className="text-slate-500">{formatProductPrice(p)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
