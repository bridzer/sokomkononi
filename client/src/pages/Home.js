import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import StatsSection from '../components/StatsSection';
import WhatsAppButton from '../components/WhatsAppButton';
import PhoneButton from '../components/PhoneButton';
import { BUSINESS } from '../utils/format';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/products?featured=true&limit=8').then((r) => setFeatured(r.data.products || []));
    api.get('/categories').then((r) => setCategories(r.data.categories || []));
  }, []);

  const orderMessage = `Hello ${BUSINESS.name}, I'd like to place an order.`;

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.4)), url(https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1800&q=80)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32 text-white">
          <div className="max-w-2xl">
            <span className="badge bg-brand-500 text-white mb-4">Kalro Farm Kenya · Naivasha</span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Healthy Dairy Cattle,Goats, Poultry &amp; Farm-Fresh Eggs
            </h1>
            <p className="mt-4 text-lg text-white/90">
              High-quality Saneen, Alpine and Toggenburg dairy goats, boer goats,
              commercial layers, kanga birds and farm-fresh eggs. Fully vaccinated,
              disease-free, delivered countrywide.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">Browse products</Link>
              <WhatsAppButton message={orderMessage} className="btn-whatsapp" placement="bottom-start">
                Order via WhatsApp
              </WhatsAppButton>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-white/85">
              <span>✓ Free countrywide delivery</span>
              <span>✓ Fully vaccinated &amp; registered</span>
              <span>✓ Twin genetics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Shop by category</h2>
            <p className="text-slate-500 text-sm">Everything from day-old chicks to milk-ready mothers.</p>
          </div>
          <Link to="/shop" className="text-brand-700 text-sm font-medium hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop/${c.slug}`}
              className="group relative overflow-hidden rounded-xl aspect-[4/3] shadow"
            >
              <img
                src={c.image_url}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="font-semibold text-lg">{c.name}</div>
                <div className="text-xs text-white/80">{c.product_count} products</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust / Stats */}
      <StatsSection />

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Featured products</h2>
            <p className="text-slate-500 text-sm">Popular picks from our farm.</p>
          </div>
          <Link to="/shop" className="text-brand-700 text-sm font-medium hover:underline">
            Shop all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Why choose */}
      <section className="bg-brand-50 mt-14">
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-800">Why choose Kalro Farm?</h2>
            <ul className="mt-4 space-y-3 text-slate-700">
              <li>✅ Guide book available for new farmers</li>
              <li>✅ Disease-free dairy goats</li>
              <li>✅ Fully vaccinated and registered</li>
              <li>✅ Twin genetics for higher productivity</li>
              <li>✅ 3-4 litres of milk production per day</li>
              <li>✅ Free countrywide delivery on order</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/about" className="btn-outline">About the farm</Link>
              <PhoneButton className="btn-primary" placement="top-start">
                Call our team
              </PhoneButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              className="rounded-xl aspect-square object-cover"
              src="https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=700&q=80"
              alt="Goats"
              loading="lazy"
            />
            <img
              className="rounded-xl aspect-square object-cover"
              src="https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=700&q=80"
              alt="Eggs"
              loading="lazy"
            />
            <img
              className="rounded-xl aspect-square object-cover"
              src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=700&q=80"
              alt="Poultry"
              loading="lazy"
            />
            <img
              className="rounded-xl aspect-square object-cover"
              src="https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=700&q=80"
              alt="Boer goats"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-7xl mx-auto px-4 py-14 text-center">
        <h2 className="text-3xl font-bold text-slate-800">Ready to order?</h2>
        <p className="mt-2 text-slate-600">
          Talk to us on WhatsApp or call — delivery is free countrywide.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <WhatsAppButton message={orderMessage} placement="top-center">
            Order via WhatsApp
          </WhatsAppButton>
          <PhoneButton className="btn-outline" placement="top-center">
            Call our team
          </PhoneButton>
        </div>
      </section>
    </div>
  );
}
