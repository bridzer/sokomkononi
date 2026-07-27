import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../utils/format';
import WhatsAppButton from '../components/WhatsAppButton';

export default function About() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,178,92,0.18),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brand-200/90 mb-2">
            The market in your hand
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            About Soko Mkononi
          </h1>
          <p className="mt-4 max-w-3xl text-brand-100 text-base md:text-lg leading-relaxed">
            Soko Mkononi is Kenya&apos;s agricultural marketplace — built to connect farmers
            with buyers of livestock, crops, horticulture, farm machinery, and inputs.
            Less hunting through brokers. More clear listings, fair prices, and delivery you can plan for.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-800">What we stand for</h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>✅ Farmers first — sellers and buyers meet in one trusted soko.</li>
            <li>✅ Broad farm catalog — from animals and produce to machinery and inputs.</li>
            <li>✅ WhatsApp-native ordering — trade the way Kenyans already talk.</li>
            <li>✅ Transparent listings — see what you&apos;re buying before you commit.</li>
            <li>✅ Countrywide reach — delivery arranged across Kenya&apos;s counties.</li>
            <li>✅ Practical support — our team helps you find the right stock or buyer.</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <img className="rounded-xl aspect-square object-cover" src="/cow.jpg" alt="Cattle available on Soko Mkononi" />
          <img className="rounded-xl aspect-square object-cover" src="/dairygoat.jpg" alt="Dairy goats from marketplace sellers" />
          <img
            className="rounded-xl aspect-square object-cover"
            src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=700&q=80"
            alt="Poultry for farm buyers"
          />
          <img className="rounded-xl aspect-square object-cover" src="/boargoat.jpg" alt="Boer goats on the marketplace" />
        </div>
      </section>

      <section className="bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="font-display text-2xl font-semibold text-slate-800 text-center mb-8">
            What you&apos;ll find on the marketplace
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Livestock & poultry',
                text: 'Dairy goats, cattle, boer goats, layers, and more — listed by farm sellers ready to talk on WhatsApp.',
              },
              {
                title: 'Crops & horticulture',
                text: 'Produce and planting needs from Kenya’s growing regions, browsable in one catalog.',
              },
              {
                title: 'Machinery & inputs',
                text: 'Farm equipment, soil science products, and inputs so you can stock the farm without three different trips.',
              },
            ].map((c) => (
              <div key={c.title} className="card p-6">
                <div className="text-brand-700 font-semibold">{c.title}</div>
                <p className="text-slate-700 mt-2 text-sm leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14 text-center">
        <h2 className="font-display text-2xl font-semibold text-slate-800">
          Ready to join Soko Mkononi?
        </h2>
        <p className="text-slate-600 mt-2 max-w-lg mx-auto">
          Browse the marketplace, message us on WhatsApp, or call — we&apos;re here to connect farmers and buyers.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-primary">Browse the marketplace</Link>
          <WhatsAppButton
            message={`Hello ${BUSINESS.name}, I'd like to learn more about the marketplace.`}
            className="btn-whatsapp"
            placement="top-center"
          >
            Chat on WhatsApp
          </WhatsAppButton>
        </div>
      </section>
    </div>
  );
}
