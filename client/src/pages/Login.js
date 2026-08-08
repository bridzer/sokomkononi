import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const redirectTo =
    typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname || '/account';

  // Already logged in — send each role to the right hub
  React.useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') navigate('/admin', { replace: true });
    else if (user.role === 'seller') navigate('/seller', { replace: true });
    else navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const loggedIn = await login(form.email, form.password);
      toast.success(`Welcome back, ${loggedIn.name}`);
      if (loggedIn.role === 'admin') navigate('/admin');
      else if (loggedIn.role === 'seller') navigate('/seller');
      else navigate(redirectTo);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-extrabold text-slate-800">Customer login</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sign in to track your orders
        {redirectTo === '/checkout' ? ' and complete checkout' : ''}. New here?{' '}
        <Link to="/register" state={{ from: redirectTo }} className="text-brand-700 font-semibold hover:underline">
          Create an account
        </Link>
      </p>

      <form onSubmit={submit} className="mt-6 card p-5 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Email</label>
          <input
            type="email"
            className="input mt-1 w-full"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Password</label>
          <input
            type="password"
            className="input mt-1 w-full"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
