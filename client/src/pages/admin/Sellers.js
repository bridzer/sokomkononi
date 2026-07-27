import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';

const empty = {
  id: null,
  name: '',
  phone: '',
  email: '',
  whatsapp: '',
  location: '',
  bio: '',
  is_active: true,
};

export default function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/sellers')
      .then((r) => setSellers(r.data.sellers || []))
      .catch((err) => toast.error(formatApiError(err, 'Failed to load sellers')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!editing.name.trim()) {
      toast.error('Seller name is required');
      return;
    }
    try {
      const payload = {
        ...editing,
        name: editing.name.trim(),
      };
      if (editing.id) {
        await api.put(`/admin/sellers/${editing.id}`, payload);
        toast.success('Seller updated');
      } else {
        await api.post('/admin/sellers', payload);
        toast.success('Seller created');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save seller'));
    }
  };

  const remove = async (id) => {
    if (
      !window.confirm(
        'Delete this seller? Their products will default to Soko Mkononi.'
      )
    ) {
      return;
    }
    try {
      await api.delete(`/admin/sellers/${id}`);
      toast.success('Seller deleted');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete seller'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Sellers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Assign sellers to products. Products without a seller belong to Soko Mkononi by default.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          + New seller
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500 text-center">Loading…</div>
        ) : sellers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No sellers yet. Create one, then assign them on a product.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sellers.map((s) => (
              <div key={s.id} className="p-4 flex flex-wrap gap-3 justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {s.location && <div>📍 {s.location}</div>}
                    {s.phone && <div>📞 {s.phone}</div>}
                    {s.whatsapp && <div>💬 WhatsApp {s.whatsapp}</div>}
                    {s.email && <div>✉️ {s.email}</div>}
                    <div>{s.product_count || 0} product(s)</div>
                  </div>
                  {!s.is_active && (
                    <span className="badge bg-slate-100 text-slate-600 mt-2">Inactive</span>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  <button className="btn-outline text-sm py-1.5" onClick={() => setEditing({ ...s })}>
                    Edit
                  </button>
                  <button
                    className="btn-ghost text-sm py-1.5 text-red-600"
                    onClick={() => remove(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={save}
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg p-5 space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold">
              {editing.id ? 'Edit seller' : 'New seller'}
            </h2>
            {[
              ['name', 'Name *', true],
              ['phone', 'Phone', false],
              ['whatsapp', 'WhatsApp', false],
              ['email', 'Email', false],
              ['location', 'Location', false],
            ].map(([key, label, required]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input w-full"
                  type={key === 'email' ? 'email' : 'text'}
                  value={editing[key] || ''}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  required={required}
                />
              </div>
            ))}
            <div>
              <label className="label">Bio / notes</label>
              <textarea
                className="input w-full"
                rows={3}
                value={editing.bio || ''}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
