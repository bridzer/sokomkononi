import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import ImageUpload from '../../components/ImageUpload';

const empty = {
  id: null,
  name: '',
  description: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
  parent_id: '',
};

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

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories]
  );

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editing,
        parent_id: editing.parent_id ? Number(editing.parent_id) : null,
      };
      if (editing.id) {
        await api.put(`/admin/categories/${editing.id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', payload);
        toast.success('Category created');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (
      !window.confirm(
        'Delete this category? Subcategories under a main category will also be deleted. Products will be un-categorised.'
      )
    ) {
      return;
    }
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const typeLabel = (c) => (c.parent_id ? 'Subcategory' : 'Main');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Main categories (e.g. Livestock) contain subcategories. Products belong to a subcategory.
          </p>
        </div>
        <button
          className="btn-primary w-full sm:w-auto shrink-0"
          onClick={() => setEditing({ ...empty })}
        >
          + New category
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500 text-center">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No categories yet.</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {categories.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">
                        {c.parent_id ? (
                          <span className="text-slate-400 font-normal">↳ </span>
                        ) : null}
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {typeLabel(c)}
                        {c.parent_name ? ` · under ${c.parent_name}` : ''} · {c.slug}
                      </div>
                      {c.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-center">
                      {c.is_active ? (
                        <span className="badge bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-700">Hidden</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn-outline flex-1 text-sm py-2"
                      onClick={() =>
                        setEditing({ ...c, parent_id: c.parent_id || '' })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost flex-1 text-sm py-2 text-red-600 hover:bg-red-50"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Parent</th>
                    <th className="p-3 text-left">Slug</th>
                    <th className="p-3 text-center">Active</th>
                    <th className="p-3 text-center">Sort</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-slate-800">
                        {c.parent_id ? (
                          <span className="pl-3 text-slate-700">↳ {c.name}</span>
                        ) : (
                          c.name
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{typeLabel(c)}</td>
                      <td className="p-3 text-slate-600">{c.parent_name || '—'}</td>
                      <td className="p-3 text-slate-500">{c.slug}</td>
                      <td className="p-3 text-center">
                        {c.is_active ? (
                          <span className="badge bg-green-100 text-green-800">Active</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-700">Hidden</span>
                        )}
                      </td>
                      <td className="p-3 text-center">{c.sort_order}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          className="text-brand-700 hover:underline mr-3"
                          onClick={() =>
                            setEditing({ ...c, parent_id: c.parent_id || '' })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => remove(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto">
          <form
            onSubmit={save}
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg p-4 sm:p-6 sm:my-8 max-h-[92vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {editing.id ? 'Edit category' : 'New category'}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2 -mr-2 text-slate-500 hover:text-slate-800"
                aria-label="Close"
              >
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
              <label className="label">Parent (main category)</label>
              <select
                className="input"
                value={editing.parent_id || ''}
                onChange={(e) => setEditing({ ...editing, parent_id: e.target.value })}
              >
                <option value="">— None (this is a main category) —</option>
                {mainCategories
                  .filter((m) => m.id !== editing.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Leave empty for a top-level category. Choose a parent to create a subcategory.
              </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Sort order</label>
                <input
                  type="number"
                  className="input"
                  value={editing.sort_order || 0}
                  onChange={(e) =>
                    setEditing({ ...editing, sort_order: Number(e.target.value) })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm pt-0 sm:pt-6">
                <input
                  type="checkbox"
                  checked={!!editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 sm:border-0">
              <button
                type="button"
                className="btn-ghost w-full sm:w-auto py-2.5"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary w-full sm:w-auto py-2.5">
                Save category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
