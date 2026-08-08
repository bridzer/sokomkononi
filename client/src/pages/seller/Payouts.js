import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatKsh } from '../../utils/format';

export default function SellerPayouts() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = status ? `?status=${status}` : '';
    api
      .get(`/seller/payouts${q}`)
      .then((r) => {
        setEntries(r.data.entries || []);
        setSummary(r.data.summary || null);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load payouts'))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Marketplace commission snapshot — remittance is marked by Soko Mkononi after M-Pesa.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: 'Owed to you', value: formatKsh(summary?.owed_net || 0) },
          { label: 'Commission held', value: formatKsh(summary?.owed_commission || 0) },
          { label: 'Already remitted', value: formatKsh(summary?.remitted_net || 0) },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              {c.label}
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['', 'owed', 'remitted'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase ring-1 ${
              status === s
                ? 'bg-brand-50 text-brand-800 ring-brand-300'
                : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-6 text-slate-500 text-sm">Loading…</div>
        ) : !entries.length ? (
          <div className="p-6 text-slate-500 text-sm">No payout lines yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">GMV</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{e.order_number}</td>
                  <td className="px-3 py-2">{e.product_name}</td>
                  <td className="px-3 py-2">{formatKsh(e.gmv)}</td>
                  <td className="px-3 py-2">{formatKsh(e.commission)}</td>
                  <td className="px-3 py-2 font-semibold">{formatKsh(e.net_amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`badge ${
                        e.status === 'remitted'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-900'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
