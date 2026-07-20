import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WHATSAPP_NUMBERS, whatsappUrl } from '../utils/format';
import { trackWhatsAppClick } from '../utils/analytics';

const POPOVER_WIDTH = 288;   // matches Tailwind's w-72 (18rem @ 16px root)
const GAP = 8;               // px between trigger and popover
const VIEWPORT_PADDING = 8;  // px kept clear from viewport edges

function WaIcon(props) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.8L.5 31.5l7.9-2.1c2.2 1.2 4.8 1.9 7.6 1.9C24.6 31.3 31.5 24.4 31.5 15.8 31.5 7.4 24.6.5 16 .5zm7.2 20.4c-.4-.2-2.3-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.2-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.2-2-2.6-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.7.2-.2.2-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.4 1.4 3.6.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.3-1 2.6-1.9.3-.9.3-1.7.2-1.9-.1-.2-.4-.3-.8-.5z" />
    </svg>
  );
}

/**
 * WhatsApp CTA button.
 *
 * If more than one WhatsApp number is configured (via `.env`), the button
 * opens a popover chooser. The popover is rendered into `document.body`
 * through a React portal so it can never be clipped by an ancestor with
 * `overflow: hidden` (e.g. the ProductCard).
 *
 * If exactly one WhatsApp number is configured, the button renders as a plain
 * `<a>` link straight to wa.me — no popover, no extra click.
 */
export default function WhatsAppButton({
  message = '',
  className = 'btn-whatsapp',
  children,
  placement = 'bottom-end',
  title = 'Choose a line to chat on',
  onOpenChange,
  analyticsContext = 'general',
}) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const computePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const [vert, horiz] = String(placement).split('-');
    const style = {};

    if (vert === 'top') {
      style.bottom = Math.max(VIEWPORT_PADDING, vh - rect.top + GAP);
    } else {
      style.top = Math.min(vh - VIEWPORT_PADDING, rect.bottom + GAP);
    }

    let left;
    if (horiz === 'end') left = rect.right - POPOVER_WIDTH;
    else if (horiz === 'center') left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    else left = rect.left;

    left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - POPOVER_WIDTH - VIEWPORT_PADDING));
    style.left = left;

    return style;
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }
    setPos(computePosition());
    const update = () => setPos(computePosition());
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, computePosition]);

  useEffect(() => {
    onOpenChange?.(open);
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !popoverRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  // Single-number fast path: render a direct link — no chooser required.
  if (WHATSAPP_NUMBERS.length <= 1) {
    const only = WHATSAPP_NUMBERS[0];
    return (
      <a
        href={whatsappUrl(message, only?.number)}
        target="_blank"
        rel="noreferrer"
        className={className}
        aria-label="Chat on WhatsApp"
        onClick={() => trackWhatsAppClick(analyticsContext)}
      >
        {children ?? <WaIcon className="w-4 h-4" />}
      </a>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {children ?? <WaIcon className="w-4 h-4" />}
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={popoverRef}
            role="menu"
            style={{
              position: 'fixed',
              width: POPOVER_WIDTH,
              maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
              zIndex: 9999,
              ...pos,
            }}
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600">
                {title}
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {WHATSAPP_NUMBERS.map((n) => (
                <a
                  key={n.id}
                  href={whatsappUrl(message, n.number)}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  onClick={() => {
                    trackWhatsAppClick(analyticsContext);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#25D366] text-white grid place-items-center flex-shrink-0">
                    <WaIcon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {n.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{n.display}</div>
                    {n.subtitle && (
                      <div className="text-[11px] text-slate-400 truncate">{n.subtitle}</div>
                    )}
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
