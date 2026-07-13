import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        toast.error('You do not have admin access');
        return;
      }
      toast.success('Welcome back!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-brand-800 grid place-items-center px-4 py-8"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-5 sm:mb-6">
          <span className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white grid place-items-center overflow-hidden ring-4 ring-white/10 shadow-lg">
            <img
              src="/kalro-logo.png"
              alt="Kalro Farm Kenya logo"
              className="w-full h-full object-cover"
            />
          </span>
          <h1 className="text-white text-xl sm:text-2xl font-bold mt-3">Kalro Farm Admin</h1>
          <p className="text-brand-200 text-sm">Sign in to manage the store</p>
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
            />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>          
        </form>
      </div>
    </div>
  );
}
