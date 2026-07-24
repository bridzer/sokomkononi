import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import {
  buildPricingPayload,
  formatProductPrice,
  pricingFromProduct,
  validatePricingForm,
} from '../../utils/pricing';
import SafeImage, { DEFAULT_FALLBACK } from '../../components/SafeImage';
import MultiImageUpload from '../../components/MultiImageUpload';
import PriceFields from '../../components/PriceFields';
import ShareProductMenu from '../../components/ShareProductMenu';

const empty = {
  id: null,
  category_id: '',
  seller_id: '',
  name: '',
  description: '',
  breed: '',
  age_stage: '',
  unit: 'each',
  price_type: 'fixed',
  price: '',
  price_max: '',
  stock: 0,
  image_url: '',
  images: [],
  is_active: true,
  is_featured: false,
};

// Reconcile the `images` array with the legacy `image_url` field so the form
// always shows a gallery even for products created before this feature.
function coerceImages(product) {
  const arr = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (arr.length) return arr;
  return product?.image_url ? [product.image_url] : [];
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
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
      api.get('/admin/sellers'),
    ])
      .then(([p, c, s]) => {
        setProducts(p.data.products || []);
        setCategories(c.data.categories || []);
        setSellers(s.data.sellers || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const openNew = () => setEditing({ ...empty, images: [] });
  const openEdit = (p) =>
    setEditing({
      ...p,
      category_id: p.category_id || '',
      seller_id: p.seller_id || '',
      images: coerceImages(p),
      ...pricingFromProduct(p),
    });
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();

    const pricingError = validatePricingForm(editing);
    if (pricingError) {
      toast.error(pricingError);
      return;
    }

    try {
      const images = Array.isArray(editing.images) ? editing.images.filter(Boolean) : [];
      const pricing = buildPricingPayload(editing);
      const payload = {
        ...editing,
        ...pricing,
        stock: Number(editing.stock) || 0,
        category_id: editing.category_id ? Number(editing.category_id) : null,
        seller_id: editing.seller_id ? Number(editing.seller_id) : null,
        images,
        image_url: images[0] || null,
      };

      editing.id
        ? await api.put(`/admin/products/${editing.id}`, payload)
        : await api.post('/admin/products', payload);

      toast.success(editing.id ? 'Product updated' : 'Product created');
      close();
      load();
    } catch (err) {
      console.error('[admin/products save] failed', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      toast.error(formatApiError(err, 'Failed to save product'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete product'));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Products</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex gap-2 w-full sm:w-auto"
          >
            <input
              className="input flex-1 sm:w-48 md:w-64 min-w-0"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-ghost shrink-0" type="submit">Search</button>
          </form>
          <button className="btn-primary w-full sm:w-auto shrink-0" onClick={openNew}>
            + New product
          </button>
        </div>
      </div>

      <div className="card overflow-visible">
        {loading ? (
          <div className="p-6 text-slate-500 text-center">Loading…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No products found.</div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100">
              {products.map((p) => {
                const gallerySize = Array.isArray(p.images) ? p.images.length : 0;
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex gap-3">
                      <div className="relative w-14 h-14 shrink-0">
                        <SafeImage
                          src={p.image_url}
                          fallback={DEFAULT_FALLBACK}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover bg-slate-100"
                        />
                        {gallerySize > 1 && (
                          <span className="absolute -bottom-1 -right-1 text-[10px] leading-none font-semibold bg-slate-900 text-white rounded-full px-1.5 py-0.5 ring-2 ring-white">
                            +{gallerySize - 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 leading-tight">{p.name}</div>
                        {p.breed && <div className="text-xs text-slate-500 mt-0.5">{p.breed}</div>}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span>{p.category_name || 'Uncategorised'}</span>
                          <span>· {p.seller_display_name || p.seller_name || 'Kalro Farm Kenya'}</span>
                          {p.age_stage && <span>· {p.age_stage}</span>}
                          <span>· Stock: {p.stock}</span>
                        </div>
                        <div className="mt-1 font-bold text-brand-700">{formatProductPrice(p)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {p.is_active ? (
                        <span className="badge bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-700">Hidden</span>
                      )}
                      {p.is_featured && (
                        <span className="badge bg-accent-500 text-white">Featured</span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn-outline flex-1 text-sm py-2"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <ShareProductMenu product={p} className="flex-1" compact />
                      <button
                        type="button"
                        className="btn-ghost flex-1 text-sm py-2 text-red-600 hover:bg-red-50"
                        onClick={() => remove(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-b-xl">
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
                {products.map((p) => {
                  const gallerySize = Array.isArray(p.images) ? p.images.length : 0;
                  return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 shrink-0">
                          <SafeImage
                            src={p.image_url}
                            fallback={DEFAULT_FALLBACK}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-slate-100"
                          />
                          {gallerySize > 1 && (
                            <span className="absolute -bottom-1 -right-1 text-[10px] leading-none font-semibold bg-slate-900 text-white rounded-full px-1.5 py-0.5 ring-2 ring-white">
                              +{gallerySize - 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.breed}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{p.category_name || '—'}</td>
                    <td className="p-3 text-slate-700">{p.age_stage || '—'}</td>
                    <td className="p-3 text-right font-semibold text-brand-700 whitespace-nowrap">
                      {formatProductPrice(p)}
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
                    <td className="p-3 text-right whitespace-nowrap">
                      <button className="text-brand-700 hover:underline mr-3" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <ShareProductMenu product={p} className="inline-block mr-3" compact />
                      <button className="text-red-600 hover:underline" onClick={() => remove(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  );
                })}
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
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto">
          <form
            onSubmit={save}
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-2xl p-4 sm:p-6 sm:my-8 max-h-[92vh] sm:max-h-none overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {editing.id ? 'Edit product' : 'New product'}
              </h2>
              <button
                type="button"
                onClick={close}
                className="p-2 -mr-2 text-slate-500 hover:text-slate-800"
                aria-label="Close"
              >
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
                <label className="label">Seller</label>
                <select
                  className="input"
                  value={editing.seller_id || ''}
                  onChange={(e) => setEditing({ ...editing, seller_id: e.target.value })}
                >
                  <option value="">Kalro Farm Kenya (default)</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.location ? ` · ${s.location}` : ''}
                    </option>
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
              <PriceFields
                value={{
                  price_type: editing.price_type,
                  price: editing.price,
                  price_max: editing.price_max,
                }}
                onChange={(pricing) => setEditing({ ...editing, ...pricing })}
              />
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
                <MultiImageUpload
                  label="Product images (first = cover)"
                  value={editing.images || []}
                  onChange={(images) =>
                    setEditing({ ...editing, images, image_url: images[0] || '' })
                  }
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
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 sm:border-0">
              <button type="button" className="btn-ghost w-full sm:w-auto py-2.5" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn-primary w-full sm:w-auto py-2.5">
                Save product
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
