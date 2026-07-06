import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../utils/format';

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
            Healthy dairy goats, boer goats, poultry &amp; farm-fresh eggs. Free
            countrywide delivery.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm">
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
            <li><Link to="/admin/login" className="hover:text-white">Admin</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>{BUSINESS.location}</li>
            <li>
              <a href={`tel:${BUSINESS.phoneIntl}`} className="hover:text-white">
                Call: {BUSINESS.phone}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${BUSINESS.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                WhatsApp: {BUSINESS.phone}
              </a>
            </li>
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
