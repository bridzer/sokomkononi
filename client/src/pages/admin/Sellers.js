import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import AddressFields from '../../components/AddressFields';
import AddressDisplay from '../../components/AddressDisplay';
import ImageUpload from '../../components/ImageUpload';
import SellerAvatar from '../../components/SellerAvatar';
import {
  EMPTY_ADDRESS,
  addressToSellerPayload,
  formatAddressShort,
  sellerToAddress,
  validateDeliveryAddress,
} from '../../utils/address';

const empty = {
  id: null,
  name: '',
  phone: '',
  email: '',
  whatsapp: '',
  bio: '',
  avatar_url: '',
  is_active: true,
  is_verified: false,
  delivered_count: 0,
  commission_pct: '',
  address: { ...EMPTY_ADDRESS },
};

function sellerToForm(s) {
  return {
    id: s.id,
    name: s.name || '',
    phone: s.phone || '',
    email: s.email || '',
    whatsapp: s.whatsapp || '',
    bio: s.bio || '',
    avatar_url: s.avatar_url || '',
    is_active: s.is_active !== false,
    is_verified: !!s.is_verified,
    delivered_count: Number(s.delivered_count) || 0,
    commission_pct: s.commission_pct == null ? '' : String(s.commission_pct),
    address: sellerToAddress(s),
  };
}

export default function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [accountFor, setAccountFor] = useState(null);
  const [accountForm, setAccountForm] = useState({ email: '', password: '' });
  const [accountBusy, setAccountBusy] = useState(false);

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
    const addrError = validateDeliveryAddress(editing.address, { required: true });
    if (addrError) {
      toast.error(addrError);
      return;
    }
    try {
      const payload = {
        name: editing.name.trim(),
        phone: editing.phone,
        email: editing.email,
        whatsapp: editing.whatsapp,
        bio: editing.bio,
        avatar_url: editing.avatar_url || null,
        is_active: editing.is_active,
        is_verified: editing.is_verified,
        delivered_count: editing.delivered_count,
        commission_pct: editing.commission_pct,
        ...addressToSellerPayload(editing.address),
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

  const openAccount = (s) => {
    setAccountFor(s);
    setAccountForm({
      email: s.login_email || s.email || '',
      password: '',
    });
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    if (!accountFor) return;
    setAccountBusy(true);
    try {
      await api.post(`/admin/sellers/${accountFor.id}/account`, accountForm);
      toast.success(
        accountFor.login_email
          ? 'Seller login updated'
          : 'Seller login created — they can use /seller/login'
      );
      setAccountFor(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save login'));
    } finally {
      setAccountBusy(false);
    }
  };

  const unlinkAccount = async (s) => {
    if (!window.confirm(`Unlink login for ${s.name}? They will no longer access the seller hub.`)) {
      return;
    }
    try {
      await api.delete(`/admin/sellers/${s.id}/account`);
      toast.success('Login unlinked');
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to unlink'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Sellers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create seller profiles, then enable login so they can manage marketplace listings.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...empty, address: { ...EMPTY_ADDRESS } })}>
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
                <div className="min-w-0 flex gap-3">
                  <SellerAvatar seller={s} size="md" />
                  <div className="min-w-0">
                  <div className="font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                    {s.name}
                    {s.is_verified ? (
                      <span className="badge bg-sky-50 text-sky-800 border border-sky-200">
                        Verified
                      </span>
                    ) : null}
                    {s.login_email ? (
                      <span className="badge bg-brand-100 text-brand-800">Login enabled</span>
                    ) : (
                      <span className="badge bg-amber-50 text-amber-800 border border-amber-200">
                        No login
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {(formatAddressShort(s) || s.location) && (
                      <div>📍 {formatAddressShort(s) || s.location}</div>
                    )}
                    {s.phone && <div>📞 {s.phone}</div>}
                    {s.whatsapp && <div>💬 WhatsApp {s.whatsapp}</div>}
                    {s.email && <div>✉️ {s.email}</div>}
                    {s.login_email && <div>🔑 Login: {s.login_email}</div>}
                    <div>{s.product_count || 0} product(s)</div>
                    <div>{Number(s.delivered_count) || 0} delivered</div>
                    <div>
                      Commission:{' '}
                      {s.commission_pct != null && s.commission_pct !== ''
                        ? `${s.commission_pct}%`
                        : 'platform default'}
                    </div>
                  </div>
                  {!s.is_active && (
                    <span className="badge bg-slate-100 text-slate-600 mt-2">Inactive</span>
                  )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-start justify-end">
                  <button
                    type="button"
                    className="btn-primary text-sm py-1.5"
                    onClick={() => openAccount(s)}
                  >
                    {s.login_email ? 'Reset login' : 'Enable login'}
                  </button>
                  {s.login_email ? (
                    <button
                      type="button"
                      className="btn-ghost text-sm py-1.5"
                      onClick={() => unlinkAccount(s)}
                    >
                      Unlink
                    </button>
                  ) : null}
                  <button
                    className="btn-outline text-sm py-1.5"
                    onClick={() => setEditing(sellerToForm(s))}
                  >
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

      {accountFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={saveAccount}
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md p-5 space-y-3"
          >
            <h2 className="text-lg font-semibold">
              {accountFor.login_email ? 'Reset seller login' : 'Enable seller login'}
            </h2>
            <p className="text-sm text-slate-500">
              {accountFor.name} will sign in at <code className="text-xs">/seller/login</code>
            </p>
            <div>
              <label className="label">Login email</label>
              <input
                type="email"
                className="input w-full"
                required
                value={accountForm.email}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">
                {accountFor.login_email ? 'New password' : 'Password'}
              </label>
              <input
                type="password"
                className="input w-full"
                required
                minLength={6}
                value={accountForm.password}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAccountFor(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={accountBusy}>
                {accountBusy ? 'Saving…' : 'Save login'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={save}
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg p-5 space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold">
              {editing.id ? 'Edit seller' : 'New seller'}
            </h2>
            <ImageUpload
              label="Profile photo"
              variant="avatar"
              value={editing.avatar_url || ''}
              onChange={(avatar_url) => setEditing({ ...editing, avatar_url })}
              hint="Shown on product pages and the seller hub."
            />

            {[
              ['name', 'Name *', true],
              ['phone', 'Phone', false],
              ['whatsapp', 'WhatsApp', false],
              ['email', 'Email', false],
            ].map(([key, label, req]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input w-full"
                  type={key === 'email' ? 'email' : 'text'}
                  value={editing[key] || ''}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  required={req}
                />
              </div>
            ))}

            <AddressFields
              idPrefix="seller-addr"
              title="Seller base location"
              description="Where this seller operates from — used for delivery distance and storefront."
              value={editing.address}
              onChange={(address) => setEditing({ ...editing, address })}
              required
              showDetect
            />

            {editing.id && (editing.address?.county || editing.address?.address_line1) ? (
              <div className="text-xs text-slate-500 border border-slate-100 rounded-lg p-3">
                <div className="font-semibold text-slate-600 mb-1">Preview</div>
                <AddressDisplay address={{
                  ...editing.address,
                  admin_location: editing.address.location,
                }} />
              </div>
            ) : null}

            <div>
              <label className="label">Bio / notes</label>
              <textarea
                className="input w-full"
                rows={3}
                value={editing.bio || ''}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Delivered products (shown on storefront)</label>
              <input
                className="input w-full"
                type="number"
                min={0}
                value={editing.delivered_count ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, delivered_count: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="label">Marketplace commission % (optional)</label>
              <input
                className="input w-full"
                type="number"
                min={0}
                max={100}
                step="0.5"
                placeholder="Use platform default"
                value={editing.commission_pct ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, commission_pct: e.target.value })
                }
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave blank to use the Settings default. Only applies to marketplace sales.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.is_verified}
                onChange={(e) => setEditing({ ...editing, is_verified: e.target.checked })}
              />
              Verified seller
            </label>
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
