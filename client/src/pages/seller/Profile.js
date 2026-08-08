import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import AddressFields from '../../components/AddressFields';
import ImageUpload from '../../components/ImageUpload';
import SellerAvatar from '../../components/SellerAvatar';
import {
  EMPTY_ADDRESS,
  addressToSellerPayload,
  sellerToAddress,
  validateDeliveryAddress,
  loadKenyaLocations,
} from '../../utils/address';

function parseCounties(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export default function SellerProfile() {
  const { seller, setSeller, user } = useAuth();
  const [form, setForm] = useState({
    phone: '',
    whatsapp: '',
    bio: '',
    avatar_url: '',
    address: { ...EMPTY_ADDRESS },
    service_counties: [],
    pickup_label: '',
    pickup_notes: '',
  });
  const [countyOptions, setCountyOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKenyaLocations()
      .then((d) => setCountyOptions(d.counties || []))
      .catch(() => setCountyOptions([]));
  }, []);

  useEffect(() => {
    if (seller) {
      setForm({
        phone: seller.phone || '',
        whatsapp: seller.whatsapp || '',
        bio: seller.bio || '',
        avatar_url: seller.avatar_url || '',
        address: sellerToAddress(seller),
        service_counties: parseCounties(seller.service_counties),
        pickup_label: seller.pickup_label || '',
        pickup_notes: seller.pickup_notes || '',
      });
    }
  }, [seller]);

  const toggleCounty = (county) => {
    setForm((f) => {
      const set = new Set(f.service_counties);
      if (set.has(county)) set.delete(county);
      else set.add(county);
      return { ...f, service_counties: [...set].sort() };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    const addrError = validateDeliveryAddress(form.address, { required: true });
    if (addrError) {
      toast.error(addrError);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        phone: form.phone,
        whatsapp: form.whatsapp,
        bio: form.bio,
        avatar_url: form.avatar_url || null,
        service_counties: form.service_counties,
        pickup_label: form.pickup_label,
        pickup_notes: form.pickup_notes,
        ...addressToSellerPayload(form.address),
      };
      const { data } = await api.put('/seller/me', payload);
      setSeller(data.seller);
      localStorage.setItem('kalro_seller', JSON.stringify(data.seller));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const previewSeller = {
    ...seller,
    name: seller?.name,
    avatar_url: form.avatar_url,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl overflow-hidden border border-brand-100 bg-white shadow-sm">
        <div className="h-28 sm:h-36 bg-gradient-to-r from-brand-700 via-brand-600 to-amber-700 relative">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.35), transparent 45%)',
            }}
          />
        </div>
        <div className="px-5 sm:px-7 pb-6 -mt-12 relative">
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="flex items-end gap-4 min-w-0">
              <SellerAvatar
                seller={previewSeller}
                size="xl"
                className="ring-4 ring-white shadow-lg"
              />
              <div className="min-w-0 pb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                  {seller?.name || 'Seller profile'}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Shown on your product pages for buyers.
                </p>
                {seller?.is_verified ? (
                  <span className="inline-flex mt-2 badge bg-sky-50 text-sky-800 border border-sky-200">
                    Verified seller
                  </span>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    Verification is granted after successful deliveries.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-sm max-w-2xl">
        <ImageUpload
          label="Profile photo"
          variant="avatar"
          uploadBase="/seller/uploads"
          value={form.avatar_url}
          onChange={(avatar_url) => setForm((f) => ({ ...f, avatar_url }))}
          hint="A clear face or shop logo helps buyers trust your listings."
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Shop name</label>
            <input className="input w-full bg-slate-50" value={seller?.name || ''} disabled />
          </div>
          <div>
            <label className="label">Login email</label>
            <input className="input w-full bg-slate-50" value={user?.email || ''} disabled />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Phone</label>
            <input
              className="input w-full"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input
              className="input w-full"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            />
          </div>
        </div>

        <AddressFields
          idPrefix="seller-profile"
          title="Base location"
          description="Your farm or shop area — helps buyers and delivery estimates."
          value={form.address}
          onChange={(address) => setForm((f) => ({ ...f, address }))}
          required
          showDetect
        />

        <div>
          <label className="label">Counties you serve</label>
          <p className="text-xs text-slate-500 mb-2">
            Leave empty for nationwide. Selecting counties limits Shop filters to buyers in those areas.
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2 flex flex-wrap gap-1.5">
            {countyOptions.map((c) => {
              const on = form.service_counties.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCounty(c)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold ring-1 ${
                    on
                      ? 'bg-brand-50 text-brand-800 ring-brand-300'
                      : 'bg-white text-slate-600 ring-slate-200'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Pickup point name</label>
            <input
              className="input w-full"
              value={form.pickup_label}
              onChange={(e) => setForm((f) => ({ ...f, pickup_label: e.target.value }))}
              placeholder="e.g. Farm gate — Gilgil"
            />
          </div>
          <div>
            <label className="label">Pickup notes</label>
            <input
              className="input w-full"
              value={form.pickup_notes}
              onChange={(e) => setForm((f) => ({ ...f, pickup_notes: e.target.value }))}
              placeholder="Landmark, hours, contact…"
            />
          </div>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea
            className="input w-full"
            rows={4}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Tell buyers about your farm, breeds, or specialties…"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
