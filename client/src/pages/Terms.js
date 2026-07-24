import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../utils/format';
import { deliveryLabel } from '../utils/delivery';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold text-slate-800">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>

      <div className="mt-8 space-y-5 text-slate-700 leading-relaxed text-[15px]">
        <p>
          Welcome to {BUSINESS.name}. By browsing our website, placing an order, booking a product,
          or creating an account, you agree to these Terms &amp; Conditions.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">1. Products &amp; sellers</h2>
        <p>
          Products listed on this site may be supplied by {BUSINESS.name} or by independent sellers
          managed through our admin. Where no seller is assigned, the product belongs to{' '}
          {BUSINESS.name} by default. Product photos, descriptions, and prices are provided in good
          faith and may change without notice until an order is confirmed.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">2. Orders &amp; payment</h2>
        <p>
          Placing an order constitutes an offer to buy. We may accept or decline orders (for example
          if stock is insufficient). Payment may be cash/pay-on-delivery or via supported digital
          payment methods. Livestock and live animals may require a deposit before dispatch.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">3. Delivery</h2>
        <p>
          Standard delivery across Kenya is typically{' '}
          <strong>{deliveryLabel()}</strong>, subject to location, weather, and animal welfare
          considerations. Delivery timelines are estimates, not guarantees. You must provide an
          accurate phone number and address.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">4. Out-of-stock bookings</h2>
        <p>
          If a product is out of stock, you may submit a booking request. A booking is not a
          confirmed sale — it is a waitlist interest. We will contact you when stock is available;
          prices and availability may change before confirmation.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">5. Livestock &amp; farm products</h2>
        <p>
          Animals are sold as healthy and vaccinated to the best of our knowledge at the time of
          sale. After delivery and acceptance, care and management become the buyer’s responsibility.
          Please inspect stock upon delivery and raise concerns immediately.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">6. Accounts</h2>
        <p>
          Customer accounts allow you to track order status. You are responsible for keeping your
          login details secure. Admin and seller accounts are managed separately by {BUSINESS.name}.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">7. Reviews</h2>
        <p>
          Reviews must be honest and respectful. We may moderate or remove reviews that are abusive,
          misleading, or unrelated to the product.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">8. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by Kenyan law, {BUSINESS.name} is not liable for indirect
          or consequential losses arising from use of the website or delayed delivery, except where
          caused by our gross negligence or willful misconduct.
        </p>

        <h2 className="text-xl font-bold text-slate-800 pt-2">9. Contact</h2>
        <p>
          For questions about these terms, visit our{' '}
          <Link to="/contact" className="text-brand-700 font-semibold hover:underline">
            Contact page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
