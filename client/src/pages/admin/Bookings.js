import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';

const STATUSES = ['pending', 'contacted', 'fulfilled', 'cancelled'];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = filter ? `?status=${filter}` : '';
    api
      .get(`/admin/bookings${q}`)
      .then((r) => setBookings(r.data.bookings || []))
      .catch((err) => toast.error(formatApiError(err, 'Failed to load bookings')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setStatus = async (id, status) => {
    try {
      await api.put(`/admin/bookings/${id}/status`, { status });
      toast.success('Booking updated');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to update booking'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Bookings</h1>
          <p className="text-sm text-slate-500">Out-of-stock waitlist requests from customers.</p>
        </div>
        <select
          className="input w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No bookings yet.</div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    {b.product_name || `Product #${b.product_id}`}
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    {b.customer_name} · {b.customer_phone}
                    {b.customer_email ? ` · ${b.customer_email}` : ''}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Qty {b.quantity} · {new Date(b.created_at).toLocaleString('en-KE')}
                  </div>
                  {b.notes && <p className="text-sm text-slate-600 mt-1">{b.notes}</p>}
                </div>
                <select
                  className="input w-auto text-sm h-9"
                  value={b.status}
                  onChange={(e) => setStatus(b.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
