import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BUSINESS,
  PHONE_NUMBERS,
  WHATSAPP_NUMBERS,
  copyText,
  whatsappUrl,
} from '../utils/format';

// -------- Inline SVG icons --------
const PhoneIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
  </svg>
);

const CopyIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 15V5a2 2 0 012-2h10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" {...p}>
    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WaIcon = (p) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5zm7.2 20.4c-.4-.2-2.3-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.2-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.2-2-2.6-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.7.2-.2.2-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.4 1.4 3.6.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.3-1 2.6-1.9.3-.9.3-1.7.2-1.9-.1-.2-.4-.3-.8-.5z" />
  </svg>
);

const TruckIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
    <path d="M2.5 7.5h10v9h-10zM12.5 10.5h4l3 3v3h-7z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6.5" cy="17.5" r="1.5" />
    <circle cx="16.5" cy="17.5" r="1.5" />
  </svg>
);

// -------- Single phone chip --------
function PhoneChip({ phone, waNumber }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyText(phone.display);
    if (ok) {
      setCopied(true);
      toast.success(`${phone.label} number copied`);
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error('Could not copy');
    }
  };

  const waMessage = `Hello ${BUSINESS.name}, I'd like to get more info.`;
  const waHref = waNumber
    ? whatsappUrl(waMessage, waNumber.number)
    : whatsappUrl(waMessage);

  return (
    <div className="flex items-center gap-0.5 bg-white/10 hover:bg-white/[0.18] backdrop-blur-sm rounded-full p-1 transition-colors ring-1 ring-white/10">
      {/* Number itself is a tel: link → opens the phone dialer */}
      <a
        href={`tel:${phone.intl}`}
        title={`Call ${phone.label}`}
        aria-label={`Call ${phone.label}: ${phone.display}`}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-brand-500 shadow-inner grid place-items-center flex-shrink-0">
          <PhoneIcon className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="text-xs md:text-sm font-medium whitespace-nowrap leading-none flex items-baseline gap-1">
          <span className="hidden md:inline text-brand-100/70">{phone.label}:</span>
          <span className="tracking-tight">{phone.display}</span>
        </span>
      </a>

      {/* Copy */}
      <button
        type="button"
        onClick={handleCopy}
        title="Copy number"
        aria-label={`Copy ${phone.display}`}
        className={`w-8 h-8 rounded-full grid place-items-center transition-colors ${
          copied ? 'bg-brand-500/60 text-white' : 'hover:bg-white/15 text-brand-100'
        }`}
      >
        {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
      </button>

      {/* WhatsApp direct */}
      {waNumber && (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          title={`WhatsApp ${phone.label}`}
          aria-label={`WhatsApp ${phone.display}`}
          className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#1ebe57] grid place-items-center transition-colors"
        >
          <WaIcon className="w-4 h-4 text-white" />
        </a>
      )}
    </div>
  );
}

// -------- The bar itself --------
export default function ContactBar() {
  const findWa = (id) => WHATSAPP_NUMBERS.find((w) => w.id === id);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-brand-900 via-brand-700 to-brand-900 text-white">
      {/* Soft radial highlight for visual polish */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-2/3 bg-white/[0.03] blur-2xl" />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm text-brand-100/90">
          <TruckIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-300" />
          <span>
            Free countrywide delivery · Vaccinated &amp; disease-free stock
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
          {PHONE_NUMBERS.map((p) => (
            <PhoneChip key={p.id} phone={p} waNumber={findWa(p.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
