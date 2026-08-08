import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function SellerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role !== 'seller') {
        logout();
        toast.error('This login is not a seller account. Ask admin to create seller access.');
        return;
      }
      toast.success('Welcome to your seller hub');
      navigate('/seller');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 grid place-items-center px-4 py-8"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-5 sm:mb-6">
          <span className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white grid place-items-center overflow-hidden ring-4 ring-white/10 shadow-lg">
            <img
              src="/soko-mkononi-logo.png"
              alt="Soko Mkononi logo"
              className="w-full h-full object-cover"
            />
          </span>
          <h1 className="font-display text-white text-xl sm:text-2xl font-semibold mt-3">
            Seller login
          </h1>
          <p className="text-brand-200 text-sm mt-1">
            Manage your marketplace listings on Soko Mkononi
          </p>
        </div>
        <form onSubmit={onSubmit} className="card p-5 sm:p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-slate-500 text-center">
            Need an account? Ask Soko Mkononi to enable seller login for your profile.{' '}
            <Link to="/contact" className="text-brand-700 font-semibold hover:underline">
              Contact us
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
