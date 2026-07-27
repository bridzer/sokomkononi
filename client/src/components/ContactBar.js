import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  BUSINESS,
  PHONE_NUMBERS,
  WHATSAPP_NUMBERS,
  copyText,
  whatsappUrl,
} from '../utils/format';

/**
 * ContactBar — thin, mobile-first announcement + quick-contact strip.
 *
 * Design goals:
 *   • Height ~36px on mobile, ~40px on desktop (was ~64px before).
 *   • On phones: shows a trust message + two contact "capsules" containing a
 *     tel:-link on the number and inline copy + WhatsApp icon-buttons.
 *   • On tablets/desktops: adds branch labels and a delivery kicker.
 *   • Copy + WhatsApp are always one tap away; number is a real tel: link
 *     so tapping it on a phone opens the dialer.
 */

// ---------- Icons ----------
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

const ChevronDown = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------- Compact phone capsule ----------
function PhoneCapsule({ phone, waNumber }) {
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
  const waHref = waNumber ? whatsappUrl(waMessage, waNumber.number) : whatsappUrl(waMessage);

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-white/10 hover:bg-white/[0.18] ring-1 ring-white/10 transition-colors">
      {/* Tap number → phone dialer (tel:) */}
      <a
        href={`tel:${phone.intl}`}
        title={`Call ${phone.label}`}
        aria-label={`Call ${phone.label}: ${phone.display}`}
        className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full hover:bg-white/10"
      >
        <span className="w-5 h-5 rounded-full bg-brand-500 grid place-items-center shrink-0">
          <PhoneIcon className="w-2.5 h-2.5 text-white" />
        </span>
        <span className="text-[11px] sm:text-xs font-semibold tabular-nums whitespace-nowrap leading-none">
          <span className="hidden md:inline text-brand-100/70 font-normal mr-1">
            {phone.shortLabel || phone.label}:
          </span>
          {phone.display}
        </span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy number"
        aria-label={`Copy ${phone.display}`}
        className={`w-6 h-6 grid place-items-center rounded-full transition-colors ${
          copied ? 'bg-brand-500/60 text-white' : 'hover:bg-white/15 text-brand-100'
        }`}
      >
        {copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
      </button>

      {waNumber && (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          title={`WhatsApp ${phone.label}`}
          aria-label={`WhatsApp ${phone.display}`}
          className="w-6 h-6 mr-0.5 rounded-full bg-[#25D366] hover:bg-[#1ebe57] grid place-items-center"
        >
          <WaIcon className="w-3 h-3 text-white" />
        </a>
      )}
    </div>
  );
}

// ---------- Mobile: compact dropdown "Contact us" popover ----------
function MobileContactPopover({ open, onClose, anchorRef }) {
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const right = Math.max(8, window.innerWidth - r.right);
    setStyle({
      position: 'fixed',
      top: r.bottom + 6,
      right,
      width,
      zIndex: 60,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const findWa = (id) => WHATSAPP_NUMBERS.find((w) => w.id === id);

  return createPortal(
    <div style={style} className="rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 p-2 space-y-1 animate-[fade-in_.12s_ease-out]">
      {PHONE_NUMBERS.map((p) => {
        const wa = findWa(p.id);
        const waMessage = `Hello ${BUSINESS.name}, I'd like to get more info.`;
        return (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 gap-2"
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                {p.label}
              </div>
              <a
                href={`tel:${p.intl}`}
                className="text-sm font-semibold text-slate-800 tabular-nums block truncate"
              >
                {p.display}
              </a>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${p.intl}`}
                title={`Call ${p.label}`}
                className="w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-700 grid place-items-center text-white"
              >
                <PhoneIcon className="w-3.5 h-3.5" />
              </a>
              {wa && (
                <a
                  href={whatsappUrl(waMessage, wa.number)}
                  target="_blank"
                  rel="noreferrer"
                  title={`WhatsApp ${p.label}`}
                  className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#1ebe57] grid place-items-center text-white"
                >
                  <WaIcon className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

// ---------- The bar ----------
export default function ContactBar() {
  const findWa = (id) => WHATSAPP_NUMBERS.find((w) => w.id === id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileBtnRef = useRef(null);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 text-white">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-2/3 bg-white/[0.04] blur-2xl" />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 h-9 sm:h-10 flex items-center justify-between gap-3">
        {/* Delivery kicker — always compact */}
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-brand-100/90 min-w-0">
          <TruckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-300 shrink-0" />
          <span className="truncate">
            <span className="font-semibold text-white">Farm marketplace</span>
            <span className="hidden sm:inline"> · Connecting farmers globally</span>
            <span className="sm:hidden"> · WhatsApp orders</span>
          </span>
        </div>

        {/* Desktop: full capsules inline */}
        <div className="hidden sm:flex items-center gap-1.5">
          {PHONE_NUMBERS.map((p) => (
            <PhoneCapsule key={p.id} phone={p} waNumber={findWa(p.id)} />
          ))}
        </div>

        {/* Mobile: single compact "Contact" trigger */}
        <button
          ref={mobileBtnRef}
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={mobileOpen}
          className="sm:hidden flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/[0.18] ring-1 ring-white/10 px-2.5 py-1 text-[11px] font-semibold"
        >
          <span className="w-5 h-5 rounded-full bg-brand-500 grid place-items-center">
            <PhoneIcon className="w-2.5 h-2.5 text-white" />
          </span>
          Contact
          <ChevronDown className={`w-3 h-3 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>

        <MobileContactPopover
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          anchorRef={mobileBtnRef}
        />
      </div>
    </div>
  );
}
