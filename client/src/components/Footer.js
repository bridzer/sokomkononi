import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS, PHONE_NUMBERS, WHATSAPP_NUMBERS, whatsappUrl } from '../utils/format';

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
    </svg>
  );
}

function WaIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" strokeLinejoin="round" />
      <path d="M3.5 6.5l8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.6-7-12a7 7 0 1114 0c0 5.4-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-100 mt-10 lg:mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-11 h-11 rounded-full bg-white ring-1 ring-white/20 overflow-hidden inline-flex items-center justify-center">
              <img
                src="/kalro-logo.png"
                alt="Kalro Farm Kenya logo"
                className="w-full h-full object-cover"
              />
            </span>
            <div>
              <div className="text-white font-bold text-lg leading-tight">Kalro Farm</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brand-200/80">
                Kenya · Naivasha
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-brand-200 leading-relaxed">
            Healthy dairy cattle,  &amp; boer goats, poultry and farm-fresh eggs.
            Vaccinated, disease-free stock delivered countrywide.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop/cattle" className="hover:text-white transition-colors">Dairy Cattle</Link></li>
            <li><Link to="/shop/dairy-goats" className="hover:text-white transition-colors">Dairy Goats</Link></li>
            <li><Link to="/shop/boer-goats" className="hover:text-white transition-colors">Boer Goats</Link></li>
            <li><Link to="/shop/poultry" className="hover:text-white transition-colors">Poultry</Link></li>
            <li><Link to="/shop/eggs" className="hover:text-white transition-colors">Eggs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white transition-colors">About us</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            <li><Link to="/shop" className="hover:text-white transition-colors">All products</Link></li>
          </ul>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Get in touch</h4>
          <ul className="space-y-2 text-sm">
            <li className="inline-flex items-center gap-2">
              <PinIcon />
              <span>{BUSINESS.location}</span>
            </li>
            {PHONE_NUMBERS.map((p) => (
              <li key={p.id}>
                <a
                  href={`tel:${p.intl}`}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <PhoneIcon />
                  <span>
                    <span className="text-brand-200/80">{p.label}:</span>{' '}
                    <span className="tabular-nums">{p.display}</span>
                  </span>
                </a>
              </li>
            ))}
            {WHATSAPP_NUMBERS.map((n) => (
              <li key={n.id}>
                <a
                  href={whatsappUrl(`Hello ${BUSINESS.name}`, n.number)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <WaIcon />
                  <span>
                    <span className="text-brand-200/80">WhatsApp {n.label}:</span>{' '}
                    <span className="tabular-nums">{n.display}</span>
                  </span>
                </a>
              </li>
            ))}
            {BUSINESS.email && (
              <li>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors break-all"
                  aria-label={`Email ${BUSINESS.email}`}
                >
                  <MailIcon />
                  <span>
                    <span className="text-brand-200/80">Email:</span> {BUSINESS.email}
                  </span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-[11px] sm:text-xs text-brand-200 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Kalro Farm Kenya. All rights reserved.</span>
          <span className="text-brand-200/80">
            Guide book available · Disease-free · Fully vaccinated
          </span>
        </div>
      </div>

      {/* On mobile the bottom action bar covers ~64px — nudge the footer up */}
      <div className="lg:hidden h-2" aria-hidden="true" />
    </footer>
  );
}
