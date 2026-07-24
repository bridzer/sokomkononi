import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';

/**
 * Modal to book an out-of-stock product (waitlist).
 */
export default function BookProductModal({ product, open, onClose }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    quantity: 1,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!open || !product) return null;

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/bookings', {
        product_id: product.id,
        ...form,
        quantity: Math.max(1, Number(form.quantity) || 1),
      });
      toast.success(data.message || 'Booking received');
      onClose?.();
      setForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        quantity: 1,
        notes: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-title"
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl p-5 sm:p-6"
      >
        <h2 id="book-title" className="text-lg font-bold text-slate-800">
          Book this product
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{product.name}</span> is currently out of
          stock. Leave your details and we will contact you when it is available.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Full name *</label>
            <input
              className="input mt-1 w-full"
              value={form.customer_name}
              onChange={(e) => setField('customer_name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Phone / WhatsApp *</label>
            <input
              className="input mt-1 w-full"
              value={form.customer_phone}
              onChange={(e) => setField('customer_phone', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Email (optional)</label>
            <input
              type="email"
              className="input mt-1 w-full"
              value={form.customer_email}
              onChange={(e) => setField('customer_email', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Quantity</label>
            <input
              type="number"
              min={1}
              className="input mt-1 w-full"
              value={form.quantity}
              onChange={(e) => setField('quantity', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Notes (optional)</label>
            <textarea
              className="input mt-1 w-full min-h-[72px]"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="County, preferred delivery day…"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
