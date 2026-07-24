import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('false');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q =
      filter === 'all' ? '' : `?approved=${filter === 'true' ? 'true' : 'false'}`;
    api
      .get(`/admin/reviews${q}`)
      .then((r) => setReviews(r.data.reviews || []))
      .catch((err) => toast.error(formatApiError(err, 'Failed to load reviews')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const approve = async (id, is_approved) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`, { is_approved });
      toast.success(is_approved ? 'Review approved' : 'Review hidden');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to update review'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      toast.success('Review deleted');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete review'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Reviews</h1>
          <p className="text-sm text-slate-500">Approve customer reviews before they go live.</p>
        </div>
        <select
          className="input w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="false">Pending</option>
          <option value="true">Approved</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="card divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No reviews in this filter.</div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    {r.customer_name} · {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {r.product_name || `Product #${r.product_id}`} ·{' '}
                    {new Date(r.created_at).toLocaleString('en-KE')}
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
                  )}
                  <span
                    className={`badge mt-2 ${
                      r.is_approved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  {!r.is_approved && (
                    <button
                      className="btn-primary text-sm py-1.5"
                      onClick={() => approve(r.id, true)}
                    >
                      Approve
                    </button>
                  )}
                  {r.is_approved && (
                    <button
                      className="btn-outline text-sm py-1.5"
                      onClick={() => approve(r.id, false)}
                    >
                      Hide
                    </button>
                  )}
                  <button
                    className="btn-ghost text-sm py-1.5 text-red-600"
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
