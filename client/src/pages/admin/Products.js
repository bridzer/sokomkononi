import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatKsh } from '../../utils/format';
import ImageUpload from '../../components/ImageUpload';

const empty = {
  id: null,
  category_id: '',
  name: '',
  description: '',
  breed: '',
  age_stage: '',
  unit: 'each',
  price: '',
  stock: 0,
  image_url: '',
  is_active: true,
  is_featured: false,
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    Promise.all([
      api.get(`/admin/products?${params.toString()}`),
      api.get('/admin/categories'),
    ])
      .then(([p, c]) => {
        setProducts(p.data.products || []);
        setCategories(c.data.categories || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const openNew = () => setEditing({ ...empty });
  const openEdit = (p) => setEditing({ ...p, category_id: p.category_id || '' });
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editing,
        price: Number(editing.price),
        stock: Number(editing.stock),
        category_id: editing.category_id ? Number(editing.category_id) : null,
      };
      if (editing.id) {
        await api.put(`/admin/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', payload);
        toast.success('Product created');
      }
      close();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Products</h1>
        <div className="flex gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex gap-2"
          >
            <input
              className="input w-64"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-ghost" type="submit">Search</button>
          </form>
          <button className="btn-primary" onClick={openNew}>+ New product</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Age / Stage</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover bg-slate-100"
                        />
                        <div>
                          <div className="font-medium text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.breed}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{p.category_name || '—'}</td>
                    <td className="p-3 text-slate-700">{p.age_stage || '—'}</td>
                    <td className="p-3 text-right font-semibold text-brand-700">
                      {formatKsh(p.price)}
                    </td>
                    <td className="p-3 text-right">{p.stock}</td>
                    <td className="p-3 text-center">
                      {p.is_active ? (
                        <span className="badge bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-700">Hidden</span>
                      )}
                      {p.is_featured && (
                        <span className="badge bg-accent-500 text-white ml-1">Featured</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-brand-700 hover:underline mr-3" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button className="text-red-600 hover:underline" onClick={() => remove(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <form
            onSubmit={save}
            className="bg-white rounded-xl w-full max-w-2xl p-6 my-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing.id ? 'Edit product' : 'New product'}
              </h2>
              <button type="button" onClick={close} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Name *</label>
                <input
                  className="input"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={editing.category_id || ''}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Breed</label>
                <input
                  className="input"
                  value={editing.breed || ''}
                  onChange={(e) => setEditing({ ...editing, breed: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Age / Stage</label>
                <input
                  className="input"
                  value={editing.age_stage || ''}
                  onChange={(e) => setEditing({ ...editing, age_stage: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <input
                  className="input"
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  placeholder="each / per bird / per tray"
                />
              </div>
              <div>
                <label className="label">Price (KSh) *</label>
                <input
                  type="number"
                  className="input"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Stock</label>
                <input
                  type="number"
                  className="input"
                  value={editing.stock}
                  onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageUpload
                  label="Product image"
                  value={editing.image_url || ''}
                  onChange={(url) => setEditing({ ...editing, image_url: url })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active (visible on shop)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.is_featured}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                />
                Featured on home page
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary">Save product</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
