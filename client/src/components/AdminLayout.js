import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/messages', label: 'Messages' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const doLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[min(280px,85vw)] lg:w-64 bg-brand-900 text-white flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="p-4 sm:p-5 border-b border-brand-800 flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-full bg-white grid place-items-center overflow-hidden shrink-0 ring-1 ring-white/10">
            <img
              src="/kalro-logo.png"
              alt="Kalro Farm Kenya logo"
              className="w-full h-full object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold leading-tight text-sm sm:text-base">Kalro Admin</div>
            <div className="text-[11px] text-brand-200 truncate">{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 -mr-1 rounded-lg text-brand-200 hover:bg-brand-800"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-100 hover:bg-brand-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-brand-800">
          <button
            onClick={doLogout}
            className="w-full text-left px-3 py-2.5 rounded-md text-sm text-brand-100 hover:bg-brand-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="lg:hidden btn-ghost p-2 -ml-1 shrink-0"
              onClick={() => setOpen((o) => !o)}
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="lg:hidden min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="hidden lg:block text-sm text-slate-500 shrink-0">
            Signed in as <span className="font-medium text-slate-700">{user?.name}</span>
          </div>
        </header>

        <div className="flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
