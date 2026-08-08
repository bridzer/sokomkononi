# Soko Mkononi — Hybrid Marketplace Strategy

**Last updated:** 2026-08-08

## Verdict on the recommendation

The hybrid model is the right long-term shape for Soko Mkononi. Treating livestock/fresh produce the same as fertilizer bags would either:

- Cap margin on high-frequency inputs, or
- Overload unique farm lots with rigid “always-in-stock” ecommerce rules.

**Do not build auctions, escrow, or global export first.** Encode the split in data and money flow, then earn density in Kenya.

## Where the project is today

| Capability | Status |
|------------|--------|
| Multi-seller attribution (admin) | Yes |
| Platform vs seller fulfillment | Yes |
| Category taxonomy (livestock ↔ inputs) | Yes |
| WhatsApp + cart + COD/Loop | Yes |
| Commerce mode (`marketplace` / `retail`) | **Implemented (MVP)** |
| Commission snapshot on order lines | **Implemented (MVP)** |
| Timed featured / premium listings | **Implemented (MVP)** |
| Seller self-service portal | **MVP** (listings, orders, profile, payouts) |
| County / corridor proximity discovery | **Implemented** |
| Soft holds + marketplace lot lifecycle | **Implemented** |
| Market pulse / comps / seasons signals | **Implemented** |
| Seller service radius + pickup points | **Implemented** |
| Manual payout ledger (owed/remitted) | **Implemented** |
| Escrow | **Deferred** |
| Auctions | No |
| Wholesale tiers / subscriptions | No |
| Owned logistics / warehousing | No |

Today the app is still operationally a **curated storefront with seller labels**. The hybrid fields make the *economics* real; the *org chart* (sellers logging in, getting paid) is the next leap.

## How the two engines reinforce each other

```
Farmer sells goats / avocados on Marketplace
        ↓ earns cash / demand signal
Farmer buys fertilizer, feed, tools on Store
        ↓ returns next season
More sellers → more unique stock → more buyers → more input sales
```

**Psychology that fits this:**

- **Scarcity / urgency** on marketplace lots (“only 2 left”, bookings)
- **Habit / status quo** on retail inputs (reorder feed/fertilizer)
- **Network effects** once both sides are active on one login + payment rail

## Revenue stack (prioritized)

| Stream | When | Notes |
|--------|------|-------|
| Marketplace commission (5–15%) | Now (default 10%) | Snapshotted on order lines |
| Retail markup | Near-term | Add `cost_price` later; price already platform-set |
| Featured listing fees | Now (price in Settings) | Admin-granted expiry; seller self-pay later |
| Delivery / logistics fee | Mid | After insured delivery volume is real |
| Seller subscriptions | Mid | After seller portal exists |
| Financing / insurance referrals | Later | Partnership, not build-first |
| Market data / export | Later | Needs liquidity + trust |

## What we implemented in this pass

1. **`commerce_mode`** on products (+ category defaults) — Livestock / Horticulture / Crops / Fisheries / Forestry → marketplace; Inputs / Engineering / etc. → retail
2. **Commission** — Settings default + optional per-seller override; stored on `order_items` for marketplace seller lines
3. **Featured until** — Premium placement expires; Settings control default days + reference KES price
4. **Storefront badges** — Marketplace vs Store on cards and product detail
5. **Admin controls** — Products, Sellers, Settings, Orders fee column

Run `npm run migrate` (or `node server/src/scripts/migrate.js`) after DB is available so columns exist.

## 90-day operating plan

### Days 1–30 — Prove the split
- Tag every live SKU with the correct commerce mode
- Onboard 10–20 farmer sellers for marketplace lots (admin-created is fine)
- Stock 1 retail category deeply (e.g. Fertilizers + Animal feed)
- Set commission at 10%; featured price as a WhatsApp upsell (“KSh X / 30 days”)

### Days 31–60 — Density before features
- Double down on one county corridor (e.g. Nakuru–Naivasha–Nairobi)
- Weekly WhatsApp broadcast: new marketplace lots + store restocks
- Track: GMV marketplace vs retail, repeat purchase rate on retail, featured lift

### Days 61–90 — Unlock seller self-service (next build)
- Seller role + login
- Seller can create marketplace listings only
- Simple payout report (commission owed / remitted) — even if paid via M-Pesa manually

## Explicitly defer

- Auctions (need bidder liquidity + dispute process)
- Full escrow (need payment hold + release rules)
- Warehousing SaaS
- Crop insurance / lending products
- International export marketplace

## Success metrics

| Metric | Why |
|--------|-----|
| % GMV from marketplace vs retail | Confirms both engines |
| Marketplace commission collected | Core marketplace P&L |
| Retail repeat rate (30/90 day) | Habit engine |
| Featured listing conversion lift | Premium inventory ROI |
| Active sellers with ≥1 sale / month | Supply health |
