import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function Stars({ value, onChange, size = 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div className="inline-flex gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'} p-0.5`}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          <svg viewBox="0 0 24 24" className={cls} fill={n <= value ? '#f59e0b' : '#e2e8f0'}>
            <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.6 9.6l5.8-.8L12 3.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    customer_name: user?.name || '',
    rating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!productId) return;
    setLoading(true);
    api
      .get(`/reviews/product/${productId}`)
      .then((r) => {
        setReviews(r.data.reviews || []);
        setSummary(r.data.summary || { average: 0, count: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (user?.name) setForm((f) => ({ ...f, customer_name: user.name }));
  }, [user?.name]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/reviews', {
        product_id: productId,
        ...form,
        rating: Number(form.rating),
      });
      toast.success(data.message || 'Review submitted');
      setForm((f) => ({ ...f, comment: '', rating: 5 }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Customer reviews</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real feedback from farmers and buyers — approved reviews only.
          </p>
        </div>
        {summary.count > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={Math.round(summary.average)} size="sm" />
            <span className="font-semibold text-slate-800">{summary.average.toFixed(1)}</span>
            <span className="text-slate-500">({summary.count} review{summary.count === 1 ? '' : 's'})</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No reviews yet — be the first to share your experience.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold text-slate-800">{r.customer_name}</div>
                <Stars value={r.rating} size="sm" />
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-700 leading-relaxed">{r.comment}</p>}
              <p className="mt-2 text-[11px] text-slate-400">
                {new Date(r.created_at).toLocaleDateString('en-KE', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 p-4 sm:p-5 bg-white">
        <h3 className="font-semibold text-slate-800">Write a review</h3>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Your name *</label>
            <input
              className="input mt-1 w-full"
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Rating *</label>
            <div className="mt-2">
              <Stars value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold text-slate-600">Comment (optional)</label>
          <textarea
            className="input mt-1 w-full min-h-[88px]"
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder="How was the quality, delivery, and support?"
          />
        </div>
        <button type="submit" className="btn-primary mt-3" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
