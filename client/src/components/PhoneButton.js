import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PHONE_NUMBERS } from '../utils/format';

const POPOVER_WIDTH = 288;
const GAP = 8;
const VIEWPORT_PADDING = 8;

function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.9.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.4.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z" />
    </svg>
  );
}

/**
 * Phone-call CTA button. Mirrors WhatsAppButton — see that file for design
 * notes. When only one phone line is configured we render a plain `<a>`
 * `tel:` link (no chooser). When more are configured, a portal-rendered
 * popover appears next to the trigger.
 */
export default function PhoneButton({
  className = 'btn-outline',
  children,
  placement = 'bottom-end',
  title = 'Choose a line to call',
  onOpenChange,
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

  if (PHONE_NUMBERS.length <= 1) {
    const only = PHONE_NUMBERS[0];
    return (
      <a
        href={only ? `tel:${only.intl}` : '#'}
        className={className}
        aria-label="Call us"
      >
        {children ?? <PhoneIcon className="w-4 h-4" />}
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
        {children ?? <PhoneIcon className="w-4 h-4" />}
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
              {PHONE_NUMBERS.map((p) => (
                <a
                  key={p.id}
                  href={`tel:${p.intl}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center flex-shrink-0">
                    <PhoneIcon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {p.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{p.display}</div>
                    {p.subtitle && (
                      <div className="text-[11px] text-slate-400 truncate">{p.subtitle}</div>
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
