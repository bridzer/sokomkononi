import React, { memo, useEffect, useRef, useState } from 'react';
import adsenseConfig, { isAdsEnabled } from '../../config/adsense';
import { loadAdsenseScript, pushAdSlot } from '../../hooks/useAdsense';

/** Reserved height prevents layout shift (CLS) before the ad fills */
const AD_MIN_HEIGHT = 280;

/**
 * Lazy-loaded Google AdSense native ad unit.
 *
 * - Initializes only when scrolled into view (IntersectionObserver)
 * - Initializes at most once per instance (Strict Mode safe via DOM status check)
 * - Fails silently (ad blockers, network errors) — never breaks the product grid
 * - Clearly labeled "Sponsored" per AdSense policy (not disguised as a product)
 */
function NativeAd({
  slot,
  className = '',
  style,
  layout,
  layoutKey,
  format = 'fluid',
  adKey,
}) {
  const containerRef = useRef(null);
  const insRef = useRef(null);
  const pushedRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);

  const client = adsenseConfig.client;
  const canRender = isAdsEnabled() && Boolean(client) && Boolean(slot);

  // Lazy load: observe viewport entry with a small prefetch margin
  useEffect(() => {
    if (!canRender) return undefined;

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [canRender]);

  // Initialize the ad unit once visible and script is ready
  useEffect(() => {
    if (!canRender || !inView || failed || pushedRef.current) return undefined;

    const ins = insRef.current;
    if (!ins || ins.getAttribute('data-adsbygoogle-status')) {
      pushedRef.current = true;
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const loaded = await loadAdsenseScript(client);
      if (cancelled) return;

      if (!loaded) {
        setFailed(true);
        return;
      }

      if (pushedRef.current || ins.getAttribute('data-adsbygoogle-status')) {
        pushedRef.current = true;
        return;
      }

      pushAdSlot();
      pushedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [canRender, inView, failed, client, adKey, slot]);

  if (!canRender || failed) {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      aria-label="Advertisement"
      className={`native-ad-slot w-full ${className}`.trim()}
      style={{
        minHeight: inView ? undefined : AD_MIN_HEIGHT,
        ...style,
      }}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-400 text-center mb-2 select-none">
        Sponsored
      </p>
      {inView ? (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          {...(layout ? { 'data-ad-layout': layout } : {})}
          {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        />
      ) : null}
    </aside>
  );
}

export default memo(NativeAd);
