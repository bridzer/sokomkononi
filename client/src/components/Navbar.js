import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ContactBar from './ContactBar';

export default function Navbar() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/shop/dairy-goats', label: 'Dairy Goats' },
    { to: '/shop/poultry', label: 'Poultry' },
    { to: '/shop/eggs', label: 'Eggs' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <ContactBar />
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center font-bold">
            K
          </div>
          <div>
            <div className="font-extrabold text-brand-700 leading-tight">Kalro Farm</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Kenya</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium hover:text-brand-700 ${
                  isActive ? 'text-brand-700' : 'text-slate-700'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/cart" className="relative btn-ghost">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.6 4h13.2M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span className="hidden sm:inline text-sm">Cart</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-[10px] rounded-full w-5 h-5 grid place-items-center">
                {count}
              </span>
            )}
          </Link>
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="menu"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
