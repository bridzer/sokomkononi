import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((r) => setSettings(r.data.settings || {}))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings', settings);
      setSettings(data.settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500 py-8 text-center">Loading…</div>;
  }

  const loopConfigured = settings?.loop_configured;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 sm:mb-6">Settings</h1>

      <form onSubmit={save} className="card p-4 sm:p-6 space-y-6">
        <section>
          <h2 className="font-semibold text-slate-800 mb-3">Payments</h2>
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(settings.loop_payments_enabled)}
                disabled={!loopConfigured}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, loop_payments_enabled: e.target.checked }))
                }
              />
              <span>
                <span className="font-medium text-slate-800 block">Enable Loop payments</span>
                <span className="text-sm text-slate-500">
                  Shows &quot;Pay with Loop&quot; at checkout. Customers receive a mobile payment
                  prompt on their phone.
                </span>
              </span>
            </label>

            {!loopConfigured ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Loop API credentials are not configured on the server. Add{' '}
                <code className="text-xs">LOOP_CLIENT_ID</code>,{' '}
                <code className="text-xs">LOOP_CLIENT_SECRET</code>, and{' '}
                <code className="text-xs">APP_BASE_URL</code> to your Railway environment variables,
                then redeploy.
              </p>
            ) : (
              <p className="text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-lg p-3">
                Loop credentials detected. Callback URL:{' '}
                <code className="text-xs break-all">{settings.loop_callback_url || '…/api/payments/loop/callback'}</code>
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-slate-800 mb-3">Business (database)</h2>
          <p className="text-xs text-slate-500 mb-3">
            Storefront contact info primarily uses <code>REACT_APP_*</code> env vars. These fields
            are stored for admin/API use.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Business name</label>
              <input
                className="input"
                value={settings.business_name || ''}
                onChange={(e) => setSettings((s) => ({ ...s, business_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input
                className="input"
                value={settings.whatsapp_number || ''}
                onChange={(e) => setSettings((s) => ({ ...s, whatsapp_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={settings.phone_number || ''}
                onChange={(e) => setSettings((s) => ({ ...s, phone_number: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={settings.email || ''}
                onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Location</label>
              <input
                className="input"
                value={settings.location || ''}
                onChange={(e) => setSettings((s) => ({ ...s, location: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
