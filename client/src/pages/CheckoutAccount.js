import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CheckoutStepper from '../components/CheckoutStepper';
import { formatKsh } from '../utils/format';
import {
  draftToAuthPrefill,
  loadCheckoutDraft,
} from '../utils/checkoutDraft';

/**
 * Auth gate between shipping and payment.
 * Prefills login/register from contact details saved on the previous step.
 */
export default function CheckoutAccount() {
  const { user, login, register } = useAuth();
  const { items, total } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const draft = useMemo(() => loadCheckoutDraft(), []);
  const prefill = location.state?.prefill || draftToAuthPrefill(draft);

  const [mode, setMode] = useState(prefill.email ? 'register' : 'login');
  const [busy, setBusy] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: prefill.email || '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    phone: prefill.phone || '',
    password: '',
    confirm: '',
  });

  useEffect(() => {
    if (user) {
      navigate('/checkout/payment', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (items.length === 0) return;
    if (!draft.customer_name || !draft.customer_phone) {
      toast.error('Please complete contact & shipping first');
      navigate('/checkout', { replace: true });
    }
  }, [draft, items.length, navigate]);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary mt-4">
          Browse shop
        </Link>
      </div>
    );
  }

  const onLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const loggedIn = await login(loginForm.email, loginForm.password);
      toast.success(`Welcome back, ${loggedIn.name}`);
      navigate('/checkout/payment');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async (e) => {
    e.preventDefault();
    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim() || undefined,
        password: registerForm.password,
      });
      toast.success('Account created — continue to payment');
      navigate('/checkout/payment');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Secure checkout
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Sign in to continue
        </h1>
        <CheckoutStepper current="account" />
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          We filled your details from the previous step. Sign in or create an account to
          reach payment ({items.length} item{items.length === 1 ? '' : 's'} · {formatKsh(total)}
          ).
        </p>

        <div className="mt-5 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              mode === 'login' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => setMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              mode === 'register' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={onLogin} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input w-full"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input w-full"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in & continue to payment'}
            </button>
          </form>
        ) : (
          <form onSubmit={onRegister} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
            <div>
              <label className="label">Full name *</label>
              <input
                className="input w-full"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                className="input w-full"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input w-full"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="label">Password *</label>
              <input
                type="password"
                className="input w-full"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirm password *</label>
              <input
                type="password"
                className="input w-full"
                value={registerForm.confirm}
                onChange={(e) => setRegisterForm((f) => ({ ...f, confirm: e.target.value }))}
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
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? 'Creating…' : 'Create account & continue'}
            </button>
          </form>
        )}

        <Link
          to="/checkout"
          className="inline-block mt-5 text-sm text-slate-500 hover:text-brand-700"
        >
          ← Back to contact & shipping
        </Link>
      </div>
    </div>
  );
}
