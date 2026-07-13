import React from 'react';
import { Link } from 'react-router-dom';
import StatsSection from '../components/StatsSection';
import WhatsAppButton from '../components/WhatsAppButton';
import PhoneButton from '../components/PhoneButton';
import SafeImage from '../components/SafeImage';
import GoogleMapSection from '../components/GoogleMapSection';
import { BUSINESS } from '../utils/format';
import Shop from './Shop';
export default function Home() {
  

  const orderMessage = `Hello ${BUSINESS.name}, I'd like to place an order.`;

  return (
    <div>
      {/* -------- Hero -------- */}
      <section className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(rgba(20,60,30,0.72), rgba(0,0,0,0.45)), url(https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1800&q=80)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-14 sm:py-20 md:py-32 text-white">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 badge bg-accent-500 text-white mb-3 sm:mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Kalro Farm Kenya · Naivasha
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1]">
              Healthy Dairy Cattle, Goats, Poultry &amp; Farm Products
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/90 max-w-xl">
              High-quality Freshian, Ayshire, Alpine and Toggenburg Dairy goats, Poultry,
              Farm Machinery, Kanga Birds and Fresh Farm Produce. Fully vaccinated,
              disease-free, delivered countrywide.
            </p>

            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
              <Link to="/shop" className="btn-primary text-sm sm:text-base py-2.5 sm:py-3 px-5">
                Browse products
              </Link>
              <WhatsAppButton
                message={orderMessage}
                className="btn-whatsapp text-sm sm:text-base py-2.5 sm:py-3 px-5"
                placement="bottom-start"
              >
                <svg viewBox="0 0 32 32" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
                  <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5z" />
                </svg>
                Order via WhatsApp
              </WhatsAppButton>
            </div>

            <div className="mt-5 sm:mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[13px] sm:text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-brand-300">✓</span> Free countrywide delivery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-brand-300">✓</span> Fully vaccinated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-brand-300">✓</span> Twin genetics
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* -------- Marketing strip: trust badges -------- */}
      <section className="bg-brand-50/60 border-y border-brand-100">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { icon: '🚚', title: 'Free delivery', sub: 'Countrywide' },
            { icon: '🛡️', title: 'Disease-free', sub: 'Fully vaccinated' },
            { icon: '💬', title: 'WhatsApp order', sub: 'Reply in minutes' },
            { icon: '⭐', title: '10+ years', sub: 'Trusted by farmers' },
          ].map((t) => (
            <div
              key={t.title}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-1 sm:py-2"
            >
              <span className="text-lg sm:text-xl leading-none">{t.icon}</span>
              <div className="leading-tight">
                <div className="text-[12px] sm:text-sm font-semibold text-slate-800">
                  {t.title}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                  {t.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -------- Categories -------- */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10 md:py-10">
        <Shop />
             
      </section>

      {/* -------- Trust / Stats -------- */}
      <StatsSection />

      {/* -------- Google Maps -------- */}
      <GoogleMapSection />

      {/* -------- Why choose -------- */}
      <section className="bg-brand-50 mt-2 sm:mt-14">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-800">
              Why choose Kalro Farm?
            </h2>
            <ul className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-700 text-sm sm:text-[15px]">
              <li>✅ Guide book for new farmers</li>
              <li>✅ Disease-free dairy goats</li>
              <li>✅ Fully vaccinated &amp; registered</li>
              <li>✅ Twin genetics for productivity</li>
              <li>✅ 3-4 litres milk / day</li>
              <li>✅ Free countrywide delivery</li>
            </ul>
            <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-3">
              <Link to="/about" className="btn-outline text-sm sm:text-base">
                About the farm
              </Link>
              <PhoneButton className="btn-primary text-sm sm:text-base" placement="top-start">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
                </svg>
                Call our team
              </PhoneButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="/cow.jpg"
              alt="Dairy cattle"
            />
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="/dairygoat.jpg"
              alt="Dairy goats"
            />
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=700&q=80"
              alt="Poultry"
            />
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="/boargoat.jpg"
              alt="Boer goats"
            />
          </div>
        </div>
      </section>

      {/* -------- CTA banner -------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to order?</h2>
          <p className="mt-2 text-white/85 text-sm sm:text-base">
            Talk to us on WhatsApp or call — delivery is free countrywide.
          </p>
          <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            <WhatsAppButton
              message={orderMessage}
              placement="top-center"
              className="btn-whatsapp text-sm sm:text-base py-3 px-5 shadow-lg"
            >
              <svg viewBox="0 0 32 32" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
                <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5z" />
              </svg>
              Order via WhatsApp
            </WhatsAppButton>
            <PhoneButton
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/30 text-white text-sm sm:text-base py-3 px-5 rounded-lg"
              placement="top-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
                <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
              </svg>
              Call our team
            </PhoneButton>
          </div>
        </div>
      </section>
    </div>
  );
}
