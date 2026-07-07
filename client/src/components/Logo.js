import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Brand logo — renders the KALRO photo mark plus an optional wordmark.
 *
 * Variants:
 *   - "full"   (default) — mark + "Kalro Farm / Kenya" wordmark, links to /
 *   - "mark"              — just the round photo mark (no wordmark, no link)
 *   - "stacked"           — centered logo above wordmark, used on hero/login
 *
 * All variants are responsive; the wordmark auto-hides below `sm` when
 * space is tight, keeping the header compact on phones.
 */
export default function Logo({
  variant = 'full',
  size = 40,
  className = '',
  linkTo = '/',
  showWordmark = true,
  wordmarkClassName = '',
  markClassName = '',
}) {
  const mark = (
    <span
      className={`shrink-0 inline-flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden ${markClassName}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/kalro-logo.png"
        alt="Kalro Farm Kenya logo"
        className="w-full h-full object-cover"
        draggable="false"
      />
    </span>
  );

  if (variant === 'mark') return mark;

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {mark}
        {showWordmark && (
          <div className={`text-center leading-tight ${wordmarkClassName}`}>
            <div className="font-extrabold text-brand-700 text-lg tracking-tight">
              Kalro Farm
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Kenya
            </div>
          </div>
        )}
      </div>
    );
  }

  const wordmark = showWordmark && (
    <div className={`leading-tight ${wordmarkClassName}`}>
      <div className="font-extrabold text-brand-700 tracking-tight text-[15px] sm:text-base">
        Kalro Farm
      </div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-slate-500">
        Kenya
      </div>
    </div>
  );

  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      {wordmark}
    </span>
  );

  return linkTo ? (
    <Link to={linkTo} className="inline-flex items-center" aria-label="Kalro Farm Kenya — home">
      {inner}
    </Link>
  ) : (
    inner
  );
}
