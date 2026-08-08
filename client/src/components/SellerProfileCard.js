import React from 'react';
import { DEFAULT_SELLER_NAME } from '../utils/delivery';
import { sellerChatMessage } from '../utils/commerce';
import { whatsappUrl, WHATSAPP_NUMBERS } from '../utils/format';
import WhatsAppButton from './WhatsAppButton';
import SellerAvatar from './SellerAvatar';

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}

/**
 * Alibaba-style supplier card: profile, location, verification, deliveries, chat.
 */
export default function SellerProfileCard({ product }) {
  const seller = product?.seller || {
    name: product?.seller_display_name || DEFAULT_SELLER_NAME,
    location: product?.seller_location,
    avatar_url: product?.seller_avatar_url,
    is_verified: !product?.seller_id,
    delivered_count: product?.seller_delivered_count,
    product_count: null,
    is_platform: !product?.seller_id,
    whatsapp: product?.seller_whatsapp || product?.seller_phone,
  };

  const chatMessage = sellerChatMessage(product);
  const sellerWa = (seller.whatsapp || seller.phone || '').replace(/\D/g, '');
  const hasDirectWa = sellerWa.length >= 9 && !seller.is_platform;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-brand-50/40 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          <SellerAvatar seller={seller} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 truncate">{seller.name}</h2>
              {seller.is_verified ? <VerifiedBadge /> : (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Community seller
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {seller.is_platform
                ? 'Official Soko Mkononi storefront · Trusted marketplace fulfilment'
                : 'Marketplace seller on Soko Mkononi'}
            </p>
            {seller.location ? (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <span aria-hidden="true">📍</span>
                {seller.location}
              </p>
            ) : null}
          </div>
        </div>

        {hasDirectWa ? (
          <a
            href={whatsappUrl(chatMessage, sellerWa)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp shrink-0"
          >
            Chat with seller
          </a>
        ) : (
          <WhatsAppButton
            message={chatMessage}
            className="btn-whatsapp shrink-0"
            placement="bottom-end"
            analyticsContext="seller_chat"
          >
            Chat with {seller.is_platform ? 'Soko Mkononi' : 'seller'}
          </WhatsAppButton>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/80 border border-slate-100 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
            Delivered
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {seller.is_platform
              ? 'Marketplace'
              : `${Number(seller.delivered_count) || 0}+`}
          </div>
          <div className="text-xs text-slate-500">
            {seller.is_platform ? 'Insured by Soko Mkononi' : 'orders delivered'}
          </div>
        </div>
        <div className="rounded-xl bg-white/80 border border-slate-100 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
            Listings
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {seller.product_count != null ? seller.product_count : '—'}
          </div>
          <div className="text-xs text-slate-500">active products</div>
        </div>
        <div className="rounded-xl bg-white/80 border border-slate-100 px-3 py-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
            Response
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">WhatsApp</div>
          <div className="text-xs text-slate-500">
            {WHATSAPP_NUMBERS.length ? 'Usually replies same day' : 'Chat to enquire'}
          </div>
        </div>
      </div>

      {seller.bio ? (
        <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          {seller.bio}
        </p>
      ) : null}
    </section>
  );
}
