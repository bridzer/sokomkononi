import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import adsenseConfig, { isRouteEligibleForAds } from '../config/adsense';

const SCRIPT_ID = 'google-adsense-script';
const SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/** Singleton promise so the script is injected at most once per page load */
let scriptLoadPromise = null;

/**
 * Load the AdSense script asynchronously. Safe to call multiple times.
 * @param {string} clientId - Publisher id (ca-pub-…)
 * @returns {Promise<boolean>} true when adsbygoogle is available
 */
export function loadAdsenseScript(clientId) {
  if (typeof window === 'undefined' || !clientId) {
    return Promise.resolve(false);
  }

  if (window.adsbygoogle) {
    return Promise.resolve(true);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    scriptLoadPromise = Promise.resolve(true);
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `${SCRIPT_SRC}?client=${encodeURIComponent(clientId)}`;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[adsense] Failed to load AdSense script (blocked or network error)');
      scriptLoadPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Request a single ad fill for an <ins class="adsbygoogle"> element.
 * Never throws — failures are logged and ignored.
 */
export function pushAdSlot() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (err) {
    console.warn('[adsense] Ad slot push failed:', err.message);
  }
}

/**
 * Loads AdSense once on eligible public routes.
 * Call from PublicLayout so cart/checkout/admin never load the script.
 */
export default function useAdsense() {
  const { pathname } = useLocation();
  const routeEligible = isRouteEligibleForAds(pathname);
  const shouldLoad = adsenseConfig.enabled && adsenseConfig.client && routeEligible;

  useEffect(() => {
    if (!shouldLoad) return undefined;
    loadAdsenseScript(adsenseConfig.client);
    return undefined;
  }, [shouldLoad]);

  return {
    routeEligible,
    enabled: adsenseConfig.enabled && Boolean(adsenseConfig.client),
    shouldLoad,
  };
}
