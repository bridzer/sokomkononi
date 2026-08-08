import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import WhatsAppButton from './WhatsAppButton';
import { BUSINESS } from '../utils/format';

/**
 * Soft-hold a marketplace lot (creates reserve) and opens WhatsApp.
 */
export default function HoldProductModal({ product, open, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [reserve, setReserve] = useState(null);

  if (!open || !product) return null;

  const maxQty = Math.max(1, Number(product.stock) || 1);

  const holdMessage = () => {
    const expires = reserve?.expires_at
      ? new Date(reserve.expires_at).toLocaleString()
      : 'soon';
    return (
      `Hello ${BUSINESS.name}, please HOLD "${product.name}" ` +
      `(qty ${quantity}) for me. My name is ${name.trim()}, phone ${phone.trim()}. ` +
      `Hold reference until ${expires}. Product: ${window.location.origin}/product/${product.slug}`
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/reserves', {
        product_id: product.id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        quantity: Math.min(quantity, maxQty),
        source: 'whatsapp_hold',
      });
      setReserve(data.reserve);
      toast.success(
        data.already_held ? 'You already have a hold on this lot' : 'Lot held — message us on WhatsApp'
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not hold this lot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Hold this lot</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Soft-hold {product.name} while you confirm on WhatsApp. Holds expire automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!reserve ? (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Your name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Phone (WhatsApp)</label>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min={1}
                max={maxQty}
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
              <p className="text-xs text-slate-500 mt-1">Max {maxQty} in stock</p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Holding…' : 'Create hold'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              Hold active until{' '}
              <strong>{new Date(reserve.expires_at).toLocaleString()}</strong>.
              Complete your chat so the seller can confirm.
            </div>
            <WhatsAppButton
              message={holdMessage()}
              className="btn-whatsapp w-full justify-center"
              phone={product.seller_whatsapp || product.seller_phone}
            >
              Continue on WhatsApp
            </WhatsAppButton>
            <button type="button" className="btn-outline w-full" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
