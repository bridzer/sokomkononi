import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatKsh, whatsappUrl, normalizeKenyanPhone } from '../../utils/format';

const STATUSES = ['pending', 'confirmed', 'processing', 'delivered', 'cancelled'];
const statusColor = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api
      .get(`/admin/orders?${params.toString()}`)
      .then((r) => setOrders(r.data.orders || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const openDetail = async (id) => {
    const r = await api.get(`/admin/orders/${id}`);
    setDetail(r.data.order);
  };

  const setStatus = async (id, status) => {
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      toast.success('Status updated');
      load();
      if (detail?.id === id) setDetail({ ...detail, status });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
        <select
          className="input w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="p-3 text-left">Order #</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">County</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="p-3 font-mono text-brand-700">{o.order_number}</td>
                    <td className="p-3 font-medium">{o.customer_name}</td>
                    <td className="p-3">{o.customer_phone}</td>
                    <td className="p-3">{o.county || '—'}</td>
                    <td className="p-3 text-right font-semibold">{formatKsh(o.total_amount)}</td>
                    <td className="p-3 text-center">
                      <span className={`badge ${statusColor[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="p-3 text-slate-500">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button className="text-brand-700 hover:underline" onClick={() => openDetail(o.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      No orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Order {detail.order_number}</h2>
                <p className="text-xs text-slate-500">
                  {new Date(detail.created_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="card p-3">
                <div className="text-slate-500 text-xs">Customer</div>
                <div className="font-medium">{detail.customer_name}</div>
                <div>{detail.customer_phone}</div>
                {detail.customer_email && <div className="text-slate-500">{detail.customer_email}</div>}
              </div>
              <div className="card p-3">
                <div className="text-slate-500 text-xs">Delivery</div>
                <div className="font-medium">{detail.county || 'N/A'}</div>
                <div className="text-slate-700">{detail.delivery_address}</div>
              </div>
            </div>

            {detail.notes && (
              <div className="card p-3 mt-3 text-sm">
                <div className="text-slate-500 text-xs">Notes</div>
                <div>{detail.notes}</div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Unit</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items?.map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="p-2">{it.product_name}</td>
                        <td className="p-2 text-right">{it.quantity}</td>
                        <td className="p-2 text-right">{formatKsh(it.unit_price)}</td>
                        <td className="p-2 text-right font-semibold">{formatKsh(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan="3" className="p-2 text-right font-semibold">Total</td>
                      <td className="p-2 text-right font-bold text-brand-700">
                        {formatKsh(detail.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label className="text-sm text-slate-600">Status:</label>
              <select
                className="input w-40"
                value={detail.status}
                onChange={(e) => setStatus(detail.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {(() => {
                const to = normalizeKenyanPhone(detail.customer_phone);
                return to ? (
                  <a
                    href={whatsappUrl(
                      `Hello ${detail.customer_name}, this is Kalro Farm regarding your order ${detail.order_number}.`,
                      to
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp ml-auto"
                  >
                    Contact on WhatsApp
                  </a>
                ) : null;
              })()}
              <a href={`tel:${detail.customer_phone}`} className="btn-outline">
                Call customer
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
