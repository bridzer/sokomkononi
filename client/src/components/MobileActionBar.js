import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  BUSINESS,
  PHONE_NUMBERS,
  WHATSAPP_NUMBERS,
  whatsappUrl,
} from '../utils/format';
import WhatsAppButton from './WhatsAppButton';
import PhoneButton from './PhoneButton';

const WA_ICON = (
  <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5z" />
  </svg>
);

const CALL_ICON = (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
  </svg>
);

/**
 * MobileActionBar — sticky bottom action bar shown ONLY on phones.
 *
 * The most-used mobile-commerce conversion pattern: keep primary CTAs
 * (WhatsApp order, Call, Cart) inside thumb-reach at the bottom of the
 * viewport. Respects the iOS safe-area inset so it doesn't disappear
 * behind the home indicator.
 *
 * Hidden on `lg+` where the header CTAs are already reachable.
 */
export default function MobileActionBar() {
  const { count } = useCart();
  const orderMsg = `Hello ${BUSINESS.name}, I'd like to place an order.`;

  const singleWa = WHATSAPP_NUMBERS.length === 1 ? WHATSAPP_NUMBERS[0] : null;
  const singlePhone = PHONE_NUMBERS.length === 1 ? PHONE_NUMBERS[0] : null;

  const cellBase =
    'flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg font-semibold text-[11px] shadow-sm active:scale-95 transition-transform';

  const waCell = `${cellBase} bg-[#25D366] hover:bg-[#1ebe57] text-white`;
  const callCell = `${cellBase} bg-brand-600 hover:bg-brand-700 text-white`;

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed bar. */}
      <div className="lg:hidden h-16" aria-hidden="true" />

      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          {singleWa ? (
            <a
              href={whatsappUrl(orderMsg, singleWa.number)}
              target="_blank"
              rel="noreferrer"
              className={waCell}
            >
              {WA_ICON}
              WhatsApp
            </a>
          ) : (
            <WhatsAppButton message={orderMsg} placement="top-center" className={waCell}>
              {WA_ICON}
              WhatsApp
            </WhatsAppButton>
          )}

          {singlePhone ? (
            <a href={`tel:${singlePhone.intl}`} className={callCell}>
              {CALL_ICON}
              Call
            </a>
          ) : (
            <PhoneButton placement="top-center" className={callCell}>
              {CALL_ICON}
              Call
            </PhoneButton>
          )}

          <Link
            to="/cart"
            className={`${cellBase} bg-slate-900 hover:bg-slate-800 text-white relative`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.6 4h13.2M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            Cart
            {count > 0 && (
              <span className="absolute top-1 right-3 bg-accent-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
