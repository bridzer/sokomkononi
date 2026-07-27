import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Brand logo — photo mark plus Soko Mkononi wordmark.
 *
 * Variants:
 *   - "full"   (default) — mark + wordmark, links to /
 *   - "mark"              — round photo mark only
 *   - "stacked"           — centered logo above wordmark (login/hero)
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
      className={`shrink-0 inline-flex items-center justify-center rounded-full overflow-hidden bg-white ${markClassName}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/soko-mkononi-logo.png"
        alt="Soko Mkononi logo"
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
            <div className="font-display font-semibold text-brand-700 text-lg tracking-tight">
              Soko Mkononi
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              The market in your hand
            </div>
          </div>
        )}
      </div>
    );
  }

  const wordmark = showWordmark && (
    <div className={`leading-tight ${wordmarkClassName}`}>
      <div className="font-display font-semibold text-brand-700 tracking-tight text-[15px] sm:text-base">
        Soko Mkononi
      </div>
      <div className="text-[6px] sm:text-[10px] uppercase tracking-[0.18em] text-slate-500">
        The Global marketplace
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
    <Link to={linkTo} className="inline-flex items-center" aria-label="Soko Mkononi — home">
      {inner}
    </Link>
  ) : (
    inner
  );
}
