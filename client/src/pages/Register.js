import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { draftToAuthPrefill, loadCheckoutDraft } from '../utils/checkoutDraft';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill =
    location.state?.prefill ||
    (location.state?.from === '/checkout/payment' || location.state?.from === '/checkout'
      ? draftToAuthPrefill(loadCheckoutDraft())
      : {});
  const [form, setForm] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    phone: prefill.phone || '',
    password: '',
    confirm: '',
  });
  const [busy, setBusy] = useState(false);

  const redirectTo =
    typeof location.state?.from === 'string' ? location.state.from : '/account';

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      const checkoutFlow =
        redirectTo === '/checkout' ||
        redirectTo === '/checkout/payment' ||
        redirectTo === '/checkout/account';
      toast.success(
        checkoutFlow
          ? 'Account created — continue to payment'
          : 'Account created — you can track your orders'
      );
      navigate(redirectTo === '/checkout' ? '/checkout/payment' : redirectTo);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create account');
    } finally {
      setBusy(false);
    }
  };

  const checkoutFlow =
    redirectTo === '/checkout' ||
    redirectTo === '/checkout/payment' ||
    redirectTo === '/checkout/account';

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-extrabold text-slate-800">Create customer account</h1>
      <p className="mt-1 text-sm text-slate-500">
        {checkoutFlow
          ? 'Create an account to place your order and track delivery. '
          : ''}
        Already have an account?{' '}
        <Link
          to="/login"
          state={{ from: redirectTo, prefill }}
          className="text-brand-700 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>

      <form onSubmit={submit} className="mt-6 card p-5 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Full name *</label>
          <input
            className="input mt-1 w-full"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Email *</label>
          <input
            type="email"
            className="input mt-1 w-full"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Phone (optional)</label>
          <input
            className="input mt-1 w-full"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Password *</label>
          <input
            type="password"
            className="input mt-1 w-full"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Confirm password *</label>
          <input
            type="password"
            className="input mt-1 w-full"
            value={form.confirm}
            onChange={(e) => setField('confirm', e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <p className="text-xs text-slate-500">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="text-brand-700 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-brand-700 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
