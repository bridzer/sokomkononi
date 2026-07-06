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

export default function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white text-brand-700 grid place-items-center font-bold">
              K
            </div>
            <div className="text-white font-bold text-lg">Kalro Farm Kenya</div>
          </div>
          <p className="mt-3 text-sm text-brand-200">
            Healthy dairy Cattle, Goats, Boer goats, Poultry &amp; farm-fresh eggs. Free
            countrywide delivery.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop/cattle" className="hover:text-white">Dairy Cattle</Link></li>
            <li><Link to="/shop/dairy-goats" className="hover:text-white">Dairy Goats</Link></li>
            <li><Link to="/shop/boer-goats" className="hover:text-white">Boer Goats</Link></li>
            <li><Link to="/shop/poultry" className="hover:text-white">Poultry</Link></li>
            <li><Link to="/shop/eggs" className="hover:text-white">Eggs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">About us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>{BUSINESS.location}</li>
            {PHONE_NUMBERS.map((p) => (
              <li key={p.id}>
                <a
                  href={`tel:${p.intl}`}
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <PhoneIcon />
                  <span>
                    <span className="text-brand-200/80">{p.label}:</span> {p.display}
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
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <WaIcon />
                  <span>
                    <span className="text-brand-200/80">WhatsApp {n.label}:</span> {n.display}
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${BUSINESS.email}`} className="hover:text-white">
                {BUSINESS.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-brand-200 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Kalro Farm Kenya. All rights reserved.</span>
          <span>Guide book available for new farmers • Disease-free • Fully vaccinated</span>
        </div>
      </div>
    </footer>
  );
}
