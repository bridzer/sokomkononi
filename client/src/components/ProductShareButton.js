import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useProductShare from '../hooks/useProductShare';
import SafeImage, { DEFAULT_FALLBACK } from './SafeImage';
import { formatProductPrice } from '../utils/pricing';
import { canNativeShare } from '../utils/share';

function ShareIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v10M12 3l-3.5 3.5M12 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14.5v4a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlatformIcon({ id }) {
  const cls = 'w-5 h-5';
  switch (id) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.31-1.39a9.9 9.9 0 004.73 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.52 14.13c-.23.64-1.34 1.22-1.84 1.3-.47.08-1.08.11-1.74-.11-.4-.14-.92-.33-1.58-.65-2.78-1.22-4.59-4.09-4.73-4.28-.14-.19-1.13-1.51-1.13-2.88s.72-2.04.98-2.32c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18 0 .41-.07.64.49.23.55.79 1.92.86 2.06.07.14.12.3.02.49-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.31.31-.13.61.18.3.81 1.33 1.74 2.16 1.2 1.07 2.21 1.4 2.52 1.56.31.16.49.14.67-.08.18-.23.77-.9.98-1.21.21-.31.42-.26.71-.16.29.1 1.84.87 2.16 1.03.32.16.53.24.61.37.08.14.08.81-.15 1.45z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M13.5 9.5V7.7c0-.8.6-1 1-1h1.5V4h-2.1C12.8 4 11 5.8 11 8.2V9.5H9v2.7h2v6.8h2.5v-6.8H16l-.5-2.7h-2z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M17.3 4h3.2l-7 8.1L21.5 20h-6.1l-4.8-6.3-5.5 6.3H2.1l7.5-8.6L2.5 4h6.3l4.3 5.7L17.3 4zm-1.1 14.3h1.8L7.1 5.6H5.2l11 12.7z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M11.94 14.54l-.35 4.95c.5 0 .72-.22.98-.48l2.35-2.25 4.87 3.57c.89.49 1.53.23 1.77-.82l3.2-15.02h.01c.28-1.3-.47-1.81-1.33-1.5L2.3 9.38c-1.28.5-1.26 1.22-.22 1.55l5.2 1.62L18.6 6.9c.57-.38 1.09-.17.66.22" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
          <path d="M6.5 8.5h3v10h-3v-10zm1.5-4.8a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zM10 8.5h2.9v1.4h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.6V18.5h-3v-4.8c0-1.14-.02-2.6-1.58-2.6-1.58 0-1.82 1.24-1.82 2.52v4.88H10V8.5z" />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" d="M4 7l8 5 8-5M4 7v10h16V7" />
        </svg>
      );
    case 'copy':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      );
    case 'native':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M8 12h8M12 8v8" />
        </svg>
      );
    default:
      return null;
  }
}

const PLATFORM_STYLES = {
  whatsapp: 'from-[#25D366] to-[#128C7E] text-white',
  facebook: 'from-[#1877F2] to-[#0d5bd7] text-white',
  twitter: 'from-slate-800 to-slate-950 text-white',
  telegram: 'from-[#229ED9] to-[#1a7fb3] text-white',
  linkedin: 'from-[#0A66C2] to-[#084e96] text-white',
  email: 'from-brand-600 to-brand-800 text-white',
  copy: 'from-violet-500 to-purple-700 text-white',
  native: 'from-accent-500 to-orange-600 text-white',
};

/**
 * Storefront share control — gradient trigger, bottom sheet on mobile, popover on desktop.
 */
export default function ProductShareButton({
  product,
  variant = 'floating',
  className = '',
  analyticsContext = 'product',
}) {
  const panelId = useId();
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const share = useProductShare(product, { requireActive: false });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, isMobile]);

  const close = useCallback(() => setOpen(false), []);

  const runAction = useCallback(
    async (action) => {
      await action();
      close();
    },
    [close]
  );

  if (!share.shareable) return null;

  const platforms = [
    ...(canNativeShare()
      ? [{ id: 'native', label: 'Share…', action: () => runAction(share.shareNative) }]
      : []),
    { id: 'whatsapp', label: 'WhatsApp', action: () => runAction(share.shareWhatsApp) },
    { id: 'facebook', label: 'Facebook', action: () => runAction(share.shareFacebook) },
    { id: 'twitter', label: 'X', action: () => runAction(share.shareTwitter) },
    { id: 'telegram', label: 'Telegram', action: () => runAction(share.shareTelegram) },
    { id: 'linkedin', label: 'LinkedIn', action: () => runAction(share.shareLinkedIn) },
    { id: 'copy', label: 'Copy link', action: () => runAction(share.copyLink) },
    { id: 'email', label: 'Email', action: () => runAction(share.shareEmail) },
  ];

  const triggerClass =
    variant === 'floating'
      ? 'group/share absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-lg shadow-brand-900/25 ring-2 ring-white/90 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-brand-900/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2'
      : variant === 'pill'
        ? 'inline-flex items-center gap-2 rounded-full border border-brand-200 bg-gradient-to-r from-brand-50 to-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition-all hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
        : variant === 'stacked'
          ? 'flex flex-col items-center justify-center gap-px w-full py-1 px-0.5 rounded-md font-semibold text-[9px] leading-tight shadow-sm bg-brand-600 hover:bg-brand-700 text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2'
          : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2';

  const panel = open ? (
    <>
      <div
        className={`fixed inset-0 z-[9998] ${isMobile ? 'bg-black/50 backdrop-blur-[2px]' : 'bg-transparent'}`}
        aria-hidden="true"
        onClick={close}
      />
      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${product.name}`}
        className={
          isMobile
            ? 'fixed inset-x-0 bottom-0 z-[9999] rounded-t-3xl bg-white shadow-2xl animate-[slideUp_0.28s_ease-out]'
            : 'fixed z-[9999] w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10'
        }
        style={
          isMobile
            ? undefined
            : (() => {
                const rect = triggerRef.current?.getBoundingClientRect();
                if (!rect) return { top: 80, right: 16 };
                const top = Math.min(rect.bottom + 10, window.innerHeight - 420);
                const right = Math.max(16, window.innerWidth - rect.right);
                return { top, right };
              })()
        }
      >
        <div className={isMobile ? 'px-4 pt-3 pb-6' : 'p-4'}>
          {isMobile && (
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
          )}

          <div className="flex gap-3 rounded-xl bg-gradient-to-br from-brand-50/80 to-slate-50 p-3 ring-1 ring-brand-100/80">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80">
              <SafeImage
                src={product.image_url}
                fallback={DEFAULT_FALLBACK}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                Share this product
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-800">
                {product.name}
              </p>
              <p className="mt-1 text-sm font-bold text-brand-700">{formatProductPrice(product)}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Friends who tap your link will see this product on Kalro Farm Kenya.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={share.busy}
                onClick={p.action}
                className="group flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md transition-transform group-hover:scale-105 group-active:scale-95 ${PLATFORM_STYLES[p.id]}`}
                >
                  <PlatformIcon id={p.id} />
                </span>
                <span className="max-w-[4.5rem] truncate text-[10px] font-semibold text-slate-600">
                  {p.label}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            onClick={close}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${triggerClass} ${className}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Share ${product.name}`}
        data-analytics-context={analyticsContext}
        disabled={share.busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <ShareIcon
          className={
            variant === 'floating'
              ? 'w-5 h-5 drop-shadow-sm'
              : variant === 'stacked'
                ? 'w-3 h-3'
                : 'w-4 h-4'
          }
        />
        {(variant === 'pill' || variant === 'stacked') && (
          <span className="whitespace-nowrap">Share</span>
        )}
        {variant === 'floating' && (
          <span className="pointer-events-none absolute -inset-1 rounded-full bg-brand-400/30 opacity-0 blur-md transition-opacity group-hover/share:opacity-100" />
        )}
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
