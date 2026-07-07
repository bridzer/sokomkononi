import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ContactBar from './ContactBar';
import Logo from './Logo';

export default function Navbar() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  // Lock scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/shop/dairy-goats', label: 'Dairy Goats' },
    { to: '/shop/poultry', label: 'Poultry' },
    { to: '/shop/cattle', label: 'Dairy Cattle' },
    { to: '/shop/eggs', label: 'Eggs' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <ContactBar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        <Logo size={40} />

        <nav className="hidden lg:flex items-center gap-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium hover:text-brand-700 transition-colors ${
                  isActive ? 'text-brand-700' : 'text-slate-700'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/cart"
            aria-label={count > 0 ? `Cart (${count} item${count === 1 ? '' : 's'})` : 'Cart'}
            className="relative p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-brand-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.6 4h13.2M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          <button
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-[calc(2.25rem+3.5rem)] sm:top-[calc(2.5rem+3.5rem)] bg-black/40 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="lg:hidden absolute left-0 right-0 top-full bg-white border-t border-slate-200 shadow-xl z-40 max-h-[70vh] overflow-y-auto">
            <nav className="px-3 py-3 flex flex-col gap-0.5">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-3 rounded-lg text-[15px] font-medium flex items-center justify-between ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`
                  }
                >
                  <span>{l.label}</span>
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
