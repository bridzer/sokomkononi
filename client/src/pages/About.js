import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS, whatsappUrl } from '../utils/format';

export default function About() {
  return (
    <div>
      <section className="bg-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold">About Kalro Farm Kenya</h1>
          <p className="mt-3 max-w-3xl text-brand-100">
            Based in Naivasha, we breed and raise healthy dairy goats, boer goats,
            commercial layers, kanga birds and produce farm-fresh eggs.
            Our animals are disease-free, fully vaccinated and registered.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">The Kalro promise</h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>✅ Only healthy, disease-free stock leaves our farm.</li>
            <li>✅ Fully vaccinated and registered dairy goats.</li>
            <li>✅ Twin genetics — higher productivity for farmers.</li>
            <li>✅ 3-4 litres of milk per day from mature dairy goats.</li>
            <li>✅ Guide book for new farmers included with your order.</li>
            <li>✅ Free countrywide delivery, within 24 hours where possible.</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <img className="rounded-xl aspect-square object-cover" src="https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=700&q=80" alt="goats" />
          <img className="rounded-xl aspect-square object-cover" src="https://images.unsplash.com/photo-1560468660-6c11a19d7330?auto=format&fit=crop&w=700&q=80" alt="boer" />
          <img className="rounded-xl aspect-square object-cover" src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=700&q=80" alt="poultry" />
          <img className="rounded-xl aspect-square object-cover" src="https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=700&q=80" alt="eggs" />
        </div>
      </section>

      <section className="bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Dairy Goats',
              text: 'Saneen, Alpine and Toggenburg — the three best breeds for milk production in Kenya.',
            },
            {
              title: 'Poultry',
              text: 'Commercial layers from day-old chicks to point-of-lay, plus Kanga (guinea fowl) birds.',
            },
            {
              title: 'Eggs',
              text: 'Big, medium and Kienyeji eggs sold wholesale per tray. Paper and plastic trays available.',
            },
          ].map((c) => (
            <div key={c.title} className="card p-6">
              <div className="text-brand-700 font-semibold">{c.title}</div>
              <p className="text-slate-700 mt-2 text-sm leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Ready to work with Kalro Farm?</h2>
        <p className="text-slate-600 mt-2">
          Call, WhatsApp or place your order online — we deliver countrywide.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-primary">Browse products</Link>
          <a
            href={whatsappUrl(`Hello ${BUSINESS.name}, I'd like to learn more about your farm.`)}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp"
          >
            WhatsApp {BUSINESS.phone}
          </a>
        </div>
      </section>
    </div>
  );
}
