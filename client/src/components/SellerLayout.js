import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SellerAvatar from './SellerAvatar';

const links = [
  { to: '/seller', label: 'Dashboard', end: true },
  { to: '/seller/listings', label: 'My listings', end: false },
  { to: '/seller/orders', label: 'Orders', end: false },
  { to: '/seller/profile', label: 'Profile', end: false },
];

export default function SellerLayout() {
  const { user, seller, logout } = useAuth();
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
    navigate('/seller/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-50 via-slate-50 to-amber-50/40 flex">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[min(280px,85vw)] lg:w-64 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white flex flex-col transform transition-transform duration-200 shadow-xl shadow-brand-950/30 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <SellerAvatar seller={seller} size="md" ring={false} className="ring-2 ring-white/20" />
            <div className="min-w-0 flex-1">
              <div className="font-bold leading-tight text-sm sm:text-base truncate">
                {seller?.name || user?.name || 'Seller'}
              </div>
              <div className="text-[11px] text-brand-200/90 truncate mt-0.5">
                {seller?.is_verified ? 'Verified seller' : 'Seller hub'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="lg:hidden p-2 -mr-1 rounded-lg text-brand-200 hover:bg-white/10"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-brand-900 shadow-sm'
                    : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <a
            href="/shop"
            className="block px-3 py-2.5 rounded-xl text-sm text-brand-100 hover:bg-white/10"
          >
            View marketplace
          </a>
          <button
            onClick={doLogout}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-brand-100 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-3 py-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <SellerAvatar seller={seller} size="sm" />
          <div className="font-semibold text-slate-800 truncate min-w-0">
            {seller?.name || 'Seller hub'}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
