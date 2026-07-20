import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import analyticsConfig, {
  isAnalyticsEnabled,
  isRouteEligibleForAnalytics,
} from '../config/analytics';
import { initAnalytics, trackPageView } from '../utils/analytics';

/**
 * Loads GA4, tracks SPA page views, and keeps measurement scoped to public routes.
 * Call from PublicLayout (excludes /admin automatically).
 */
export default function useAnalytics() {
  const { pathname, search } = useLocation();
  const lastPath = useRef('');

  const eligible = isRouteEligibleForAnalytics(pathname);
  const enabled = isAnalyticsEnabled();
  const path = pathname + search;

  useEffect(() => {
    if (!enabled || !eligible) return undefined;

    let cancelled = false;
    initAnalytics().then((ok) => {
      if (cancelled || !ok || path === lastPath.current) return;
      trackPageView({ path, title: document.title });
      lastPath.current = path;
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, eligible, path]);

  return {
    enabled,
    eligible,
    measurementId: analyticsConfig.measurementId,
  };
}
