import React from 'react';
import { Link } from 'react-router-dom';
import StatsSection from '../components/StatsSection';
import WhatsAppButton from '../components/WhatsAppButton';
import PhoneButton from '../components/PhoneButton';
import SafeImage from '../components/SafeImage';
import GoogleMapSection from '../components/GoogleMapSection';
import HomeCategorySection from '../components/HomeCategorySection';
import CorridorProductsRail from '../components/CorridorProductsRail';
import { BUSINESS } from '../utils/format';
export default function Home() {
  

  const orderMessage = `Hello ${BUSINESS.name}, I'd like to browse farm products on the marketplace.`;

  return (
    <div>
      {/* -------- Hero -------- */}
      <section className="relative min-h-[70vh] sm:min-h-[78vh] flex items-end sm:items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(105deg, rgba(16,48,24,0.88) 0%, rgba(20,60,30,0.65) 45%, rgba(0,0,0,0.35) 100%), url(https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1800&q=80)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-5 sm:py-20 md:py-28 text-white w-full">
          <div className="max-w-2xl">
            <p className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
              Soko Mkononi
            </p>
            <p className="mt-2 text-[11px] sm:text-xs uppercase tracking-[0.22em] text-brand-200/90">
              The market in your hand
            </p>
            <h1 className="mt-4 sm:mt-5 text-xl sm:text-2xl md:text-3xl font-bold leading-snug text-white/95 max-w-xl">
              Global agricultural marketplace — connecting farmers with buyers of livestock, crops, machinery, and inputs.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/80 max-w-lg leading-relaxed">
              Browse farm goods from sellers across the country. Order on WhatsApp or online — we arrange delivery to every county.
            </p>

            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
              <Link to="/shop" className="btn-primary text-sm sm:text-base py-2.5 sm:py-3 px-5">
                Browse the marketplace
              </Link>
              <WhatsAppButton
                message={orderMessage}
                className="btn-whatsapp text-sm sm:text-base py-2.5 sm:py-3 px-5"
                placement="bottom-start"
              >
                <svg viewBox="0 0 32 32" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
                  <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5z" />
                </svg>
                Chat on WhatsApp
              </WhatsAppButton>
            </div>

            <div className="mt-5 sm:mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[13px] sm:text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-brand-300">✓</span> Farmers &amp; buyers connected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-brand-300">✓</span> Countrywide delivery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-brand-300">✓</span> Order via WhatsApp
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* -------- Marketing strip: trust badges -------- */}
      <section className="bg-brand-50/60 border-y border-brand-100">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { icon: '🤝', title: 'Direct from farmers', sub: 'Fewer middlemen' },
            { icon: '🚚', title: 'Countrywide delivery', sub: '47 counties' },
            { icon: '💬', title: 'WhatsApp order', sub: 'Reply in minutes' },
            { icon: '🌾', title: 'Full farm catalog', sub: 'Stock to inputs' },
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
        <HomeCategorySection />
      </section>

      <CorridorProductsRail />

      {/* -------- Trust / Stats -------- */}
      <StatsSection />

      {/* -------- Google Maps -------- */}
      <GoogleMapSection />

      {/* -------- Why choose -------- */}
      <section className="bg-brand-50 mt-2 sm:mt-14">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div>
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-brand-800">
              Why farmers choose Soko Mkononi
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-md">
              One marketplace for the farm goods Kenya actually trades — with chat that feels as easy as calling a neighbour.
            </p>
            <ul className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-700 text-sm sm:text-[15px]">
              <li>✅ Connect with farm sellers &amp; buyers</li>
              <li>✅ Livestock, crops, horticulture &amp; more</li>
              <li>✅ Machinery and farm inputs in one place</li>
              <li>✅ Clear prices before you commit</li>
              <li>✅ WhatsApp support in minutes</li>
              <li>✅ Delivery arranged countrywide</li>
            </ul>
            <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-3">
              <Link to="/about" className="btn-outline text-sm sm:text-base">
                About Soko Mkononi
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
              alt="Dairy cattle on a Kenyan farm"
            />
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="/dairygoat.jpg"
              alt="Dairy goats for sale"
            />
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=700&q=80"
              alt="Poultry for farm buyers"
            />
            <SafeImage
              className="rounded-xl aspect-square object-cover w-full"
              src="/boargoat.jpg"
              alt="Boer goats from marketplace sellers"
            />
          </div>
        </div>
      </section>

      {/* -------- CTA banner -------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">Ready to trade farm goods?</h2>
          <p className="mt-2 text-white/85 text-sm sm:text-base max-w-lg mx-auto">
            Open the marketplace or message us on WhatsApp — we&apos;ll help you find stock, buyers, or delivery.
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
              Chat on WhatsApp
            </WhatsAppButton>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/30 text-white text-sm sm:text-base py-3 px-5 rounded-lg"
            >
              Browse products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
