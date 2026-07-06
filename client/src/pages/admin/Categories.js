import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import ImageUpload from '../../components/ImageUpload';

const empty = { id: null, name: '', description: '', image_url: '', sort_order: 0, is_active: true };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/categories')
      .then((r) => setCategories(r.data.categories || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) {
        await api.put(`/admin/categories/${editing.id}`, editing);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', editing);
        toast.success('Category created');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this category? Products will be un-categorised.')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          + New category
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-center">Active</th>
                <th className="p-3 text-center">Sort</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{c.name}</td>
                  <td className="p-3 text-slate-500">{c.slug}</td>
                  <td className="p-3 text-slate-600 max-w-md truncate">{c.description}</td>
                  <td className="p-3 text-center">
                    {c.is_active ? (
                      <span className="badge bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-700">Hidden</span>
                    )}
                  </td>
                  <td className="p-3 text-center">{c.sort_order}</td>
                  <td className="p-3 text-right">
                    <button className="text-brand-700 hover:underline mr-3" onClick={() => setEditing(c)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => remove(c.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <form
            onSubmit={save}
            className="bg-white rounded-xl w-full max-w-lg p-6 my-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing.id ? 'Edit category' : 'New category'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <ImageUpload
              label="Category image"
              value={editing.image_url || ''}
              onChange={(url) => setEditing({ ...editing, image_url: url })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sort order</label>
                <input
                  type="number"
                  className="input"
                  value={editing.sort_order || 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </div>
              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={!!editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
