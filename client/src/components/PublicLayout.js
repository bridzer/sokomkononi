import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppFloat from './WhatsAppFloat';
import MobileActionBar from './MobileActionBar';
import useAdsense from '../hooks/useAdsense';
import useAnalytics from '../hooks/useAnalytics';

export default function PublicLayout() {
  // Load AdSense script once on eligible routes (shop/home). Excluded on cart/checkout/admin.
  useAdsense();
  // GA4 — page views + interaction events on public routes only.
  useAnalytics();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Desktop-only floating chat CTA (mobile has the bottom action bar). */}
      <div className="hidden lg:block">
        <WhatsAppFloat />
      </div>
      <MobileActionBar />
    </div>
  );
}
