# Google AdSense — Native Ads Integration

This document covers the Kalro Farm AdSense native in-feed ad implementation.

## Overview

- **Ad type:** Google AdSense Native Ads only (fluid in-feed units)
- **Placement:** One ad after every 10 products in the shop grid
- **Scope:** Home (`/` embeds Shop) and `/shop` / `/shop/:category`
- **Excluded:** Cart, checkout, order success, admin, login

Ads are injected automatically by `insertAdsIntoProducts` — never hand-placed in JSX.

## Architecture

```
client/src/
  config/adsense.js              # Single config file (enabled, client, slots)
  hooks/useAdsense.js            # Script loader (once per page load)
  utils/insertAdsIntoProducts.js # Ad injection utility
  components/ads/NativeAd.jsx      # Lazy-loaded ad unit (IntersectionObserver)
  components/ProductListingGrid.js # Product grid + automatic ads
```

## Environment variables

Copy from `client/.env.example` into `client/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_ADSENSE_ENABLED` | Yes | `true` to enable ads |
| `REACT_APP_ADSENSE_CLIENT` | Yes | Publisher ID (`ca-pub-…`) |
| `REACT_APP_ADSENSE_NATIVE_PRODUCTS_SLOT` | Yes | Default native ad unit slot |
| `REACT_APP_ADSENSE_INTERVAL` | No | Products between ads (default `10`) |
| `REACT_APP_ADSENSE_LAYOUT_KEY` | No | In-feed layout key from AdSense |
| `REACT_APP_ADSENSE_CATEGORY_NATIVE_SLOT` | No | Slot when viewing a category |
| `REACT_APP_ADSENSE_SEARCH_NATIVE_SLOT` | No | Slot when search is active |

Restart `npm start` or redeploy after changing env vars (CRA bakes them at build time).

## AdSense site verification

Google's crawler reads **static HTML** — it does not run React. Verification requires:

1. `REACT_APP_ADSENSE_CLIENT` set on Railway **before** deploy
2. The build runs `prebuild` → injects the script + meta tag into `index.html`
3. `public/ads.txt` is generated at `https://yoursite.com/ads.txt`

After deploy, confirm in browser (View Page Source):

```html
<meta name="google-adsense-account" content="ca-pub-…" />
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…">
```

Also check: `https://yoursite.com/ads.txt` loads and shows your `pub-…` id.

If script verification fails, use the **meta tag** method in AdSense and set:

`REACT_APP_GOOGLE_SITE_VERIFICATION=your-code-from-adsense`

Then redeploy.

## Enabling ads locally

1. Set env vars in `client/.env`
2. Restart the client dev server
3. Open `/shop` — ads load when slots are configured and AdSense account is approved

With `REACT_APP_ADSENSE_ENABLED=false` (default), no script loads and no ad placeholders render.

## Pagination / infinite scroll

Pass `globalOffset` to `ProductListingGrid` when loading additional product batches:

```jsx
<ProductListingGrid
  products={nextPage}
  globalOffset={alreadyLoadedCount}
  adContext={{ categorySlug, search }}
/>
```

The utility continues the 10-product spacing globally (50, 60, 70…) without duplicate ads.

## Error handling

- **AdBlock / network failure:** Ad unit fails silently; products render normally
- **Missing client or slot:** Ads disabled; no script injection
- **Ineligible route:** Script not loaded on cart/checkout/admin

## Testing

```bash
# Ad injection unit tests
npm test --prefix client -- --testPathPattern=insertAdsIntoProducts

# Full client build
npm run build --prefix client
```

Manual checks:

1. Shop grid shows "Sponsored" label between product rows (when enabled)
2. Cart / checkout / admin show no ads
3. Navigating shop → cart → shop re-initializes ads correctly
4. DevTools Network: single `adsbygoogle.js` request per page load

## Backend (Express)

`server/src/index.js` enables Content-Security-Policy via Helmet with AdSense domains allowed.

Set `ENABLE_CSP=false` to disable CSP (not recommended in production).

## Production deployment checklist

- [ ] Create native in-feed ad units in AdSense
- [ ] Set `REACT_APP_ADSENSE_ENABLED=true` in Railway/client env
- [ ] Set `REACT_APP_ADSENSE_CLIENT` and slot IDs
- [ ] Rebuild and redeploy the client
- [ ] Verify CSP does not block ads (check browser console on `/shop`)
- [ ] Confirm ads are labeled "Sponsored" and span full grid width (not fake products)
- [ ] Test cart/checkout have zero ad requests
- [ ] Monitor Core Web Vitals / CLS after launch

## Policy compliance

- Ads are clearly labeled **Sponsored**
- Ads span a full grid row — they do not mimic `ProductCard` layout
- No ads on purchase or authentication flows
- No anchor, interstitial, sticky, or video ad formats
- Lazy loading limits impact on LCP and initial render
