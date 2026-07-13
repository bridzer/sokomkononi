import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ProductCard from './ProductCard';
import NativeAd from './ads/NativeAd';
import adsenseConfig, {
  isAdsEnabled,
  isRouteEligibleForAds,
  resolveSlotForContext,
} from '../config/adsense';
import { insertAdsIntoProducts, isAdItem } from '../utils/insertAdsIntoProducts';

/**
 * Reusable product grid with automatic native ad injection.
 *
 * UI never manually places ads — `insertAdsIntoProducts` handles spacing.
 * Ads span a full grid row, are labeled "Sponsored", and lazy-load in view.
 */
export default function ProductListingGrid({
  products = [],
  loading = false,
  emptyState = null,
  adContext = {},
  globalOffset = 0,
  skeletonCount = 8,
}) {
  const { pathname } = useLocation();
  const routeEligible = isRouteEligibleForAds(pathname);
  const adSlot = resolveSlotForContext(adContext);
  const showAds = routeEligible && isAdsEnabled() && Boolean(adSlot);

  const gridItems = useMemo(() => {
    if (!showAds) return products;
    return insertAdsIntoProducts(products, {
      interval: adsenseConfig.interval,
      slot: adSlot,
      globalOffset,
    });
  }, [products, showAds, adSlot, globalOffset]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="aspect-[4/3] bg-slate-100 rounded-t-xl" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-5 w-1/3 bg-slate-100 rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return emptyState;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {gridItems.map((item) => {
        if (isAdItem(item)) {
          return (
            <NativeAd
              key={item.id}
              adKey={item.id}
              slot={item.slot}
              layoutKey={adsenseConfig.layoutKey || undefined}
              className="col-span-full my-2 sm:my-4"
            />
          );
        }

        return <ProductCard key={item.id} product={item} />;
      })}
    </div>
  );
}
