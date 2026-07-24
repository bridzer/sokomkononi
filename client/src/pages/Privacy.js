import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../utils/format';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold text-slate-800">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>

      <div className="mt-8 prose prose-slate max-w-none space-y-5 text-slate-700 leading-relaxed text-[15px]">
        <p>
          {BUSINESS.name} (“we”, “us”) respects your privacy. This policy explains how we collect,
          use, and protect information when you use our website and related services (including
          WhatsApp ordering).
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Contact details you provide (name, phone, email, delivery address, county)</li>
          <li>Order and booking details (products, quantities, payment status)</li>
          <li>Account details if you register (name, email, phone, password hash)</li>
          <li>Product reviews you submit</li>
          <li>Technical data such as device/browser type and pages visited (analytics, if enabled)</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-800 pt-2">How we use your information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To process orders, bookings, delivery, and customer support</li>
          <li>To contact you via phone, SMS, WhatsApp, or email about your order</li>
          <li>To improve our products, website, and services</li>
          <li>To show approved reviews and prevent fraud or abuse</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-800 pt-2">Sharing</h2>
        <p>
          We do not sell your personal data. We may share information with delivery partners,
          payment providers (e.g. Loop / M-Pesa), or when required by law. Sellers fulfilling
          products may receive the contact details needed to complete your order.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">Data retention &amp; security</h2>
        <p>
          We keep order and account records as long as needed for business, legal, and accounting
          purposes. We use reasonable technical measures to protect your data, but no online
          transmission is 100% secure.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">Your choices</h2>
        <p>
          You may request access to or correction of your account details by contacting us. You may
          also ask us to close your customer account (subject to outstanding orders).
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">Contact</h2>
        <p>
          Questions about this policy? Reach us via our{' '}
          <Link to="/contact" className="text-brand-700 font-semibold hover:underline">
            Contact page
          </Link>{' '}
          or email {BUSINESS.email || 'our published support email'}.
        </p>
      </div>
    </div>
  );
}
