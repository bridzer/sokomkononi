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
  fulfilled_by: 'seller',
  name: '',
  description: '',
  breed: '',
  age_stage: '',
  unit: 'each',
  price_type: 'fixed',
  price: '',
  price_max: '',
  stock: 1,
  images: [],
  is_active: true,
};

function coerceImages(product) {
  const arr = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (arr.length) return arr;
  return product?.image_url ? [product.image_url] : [];
}

export default function SellerListings() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/seller/products'), api.get('/seller/categories')])
      .then(([p, c]) => {
        setProducts(p.data.products || []);
        setCategories(c.data.categories || []);
      })
      .catch((err) => toast.error(formatApiError(err, 'Failed to load listings')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => setEditing({ ...empty, images: [] });
  const openEdit = (p) =>
    setEditing({
      ...p,
      category_id: p.category_id || '',
      fulfilled_by: p.fulfilled_by === 'platform' ? 'platform' : 'seller',
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
    if (!editing.category_id) {
      toast.error('Please select a subcategory');
      return;
    }
    try {
      const images = Array.isArray(editing.images) ? editing.images.filter(Boolean) : [];
      const pricing = buildPricingPayload(editing);
      const payload = {
        ...editing,
        ...pricing,
        stock: Number(editing.stock) || 0,
        category_id: Number(editing.category_id),
        images,
        image_url: images[0] || null,
      };
      if (editing.id) {
        await api.put(`/seller/products/${editing.id}`, payload);
        toast.success('Listing updated');
      } else {
        await api.post('/seller/products', payload);
        toast.success('Listing published');
      }
      close();
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save listing'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await api.delete(`/seller/products/${id}`);
      toast.success('Listing deleted');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">My listings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage products and share each one with buyers
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openNew}>
          + New listing
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading…</div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-600">No listings yet.</p>
            <button type="button" className="btn-primary mt-4" onClick={openNew}>
              Create your first listing
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-4 sm:p-5 flex flex-wrap gap-3 justify-between hover:bg-brand-50/30 transition-colors"
              >
                <div className="flex gap-3 min-w-0">
                  <SafeImage
                    src={p.image_url}
                    fallback={DEFAULT_FALLBACK}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0 ring-1 ring-slate-200/80"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.parent_category_name ? `${p.parent_category_name} / ` : ''}
                      {p.category_name || '—'} · Stock {p.stock}
                    </div>
                    <div className="text-sm font-bold text-brand-700 mt-1">
                      {formatProductPrice(p)}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.is_active ? (
                        <span className="badge bg-green-100 text-green-800">Live</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">Hidden</span>
                      )}
                      <span className="badge bg-brand-100 text-brand-800">Marketplace</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  <ShareProductMenu product={p} className="inline-block" allowInactive />
                  <a
                    href={`/product/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost text-sm py-2 px-3"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className="btn-outline text-sm py-2 px-3"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-sm py-2 px-3 text-red-600"
                    onClick={() => remove(p.id)}
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
              {editing.id ? 'Edit listing' : 'New listing'}
            </h2>
            <div>
              <label className="label">Product name *</label>
              <input
                className="input w-full"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Subcategory *</label>
              <select
                className="input w-full"
                value={editing.category_id || ''}
                onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.parent_name || 'Category') + ' / ' + c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Breed / variety</label>
                <input
                  className="input w-full"
                  value={editing.breed || ''}
                  onChange={(e) => setEditing({ ...editing, breed: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Age / stage</label>
                <input
                  className="input w-full"
                  value={editing.age_stage || ''}
                  onChange={(e) => setEditing({ ...editing, age_stage: e.target.value })}
                />
              </div>
            </div>
            <PriceFields
              value={{
                price_type: editing.price_type,
                price: editing.price,
                price_max: editing.price_max,
              }}
              onChange={(pricing) => setEditing({ ...editing, ...pricing })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Stock</label>
                <input
                  type="number"
                  min={0}
                  className="input w-full"
                  value={editing.stock}
                  onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <input
                  className="input w-full"
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  placeholder="each / tray / kg"
                />
              </div>
            </div>
            <div>
              <label className="label">Fulfilled by</label>
              <select
                className="input w-full"
                value={editing.fulfilled_by || 'seller'}
                onChange={(e) => setEditing({ ...editing, fulfilled_by: e.target.value })}
              >
                <option value="seller">Me (seller)</option>
                <option value="platform">Soko Mkononi delivery</option>
              </select>
            </div>
            <MultiImageUpload
              label="Photos (first = cover)"
              value={editing.images || []}
              onChange={(images) => setEditing({ ...editing, images })}
              uploadBase="/seller/uploads"
            />
            <div>
              <label className="label">Description</label>
              <textarea
                className="input w-full"
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
              Visible on marketplace
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-ghost" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save listing
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
