/** Structured delivery / seller address helpers. */

export const EMPTY_ADDRESS = {
  country_code: '',
  country_name: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  county: '',
  sub_county: '',
  location: '',
  sub_location: '',
  latitude: null,
  longitude: null,
};

/** Common countries for the picker (Kenya first). */
export const COUNTRY_OPTIONS = [
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'SO', name: 'Somalia' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CD', name: 'DR Congo' },
  { code: 'OTHER', name: 'Other country' },
];

export function countryNameFromCode(code) {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.name || code || '';
}

export function isKenyaAddress(address) {
  return String(address?.country_code || '').toUpperCase() === 'KE';
}

/** True when Kenya County → Sub-county → Location → Sub-location are all set. */
export function hasCompleteKenyaAdmin(address = {}) {
  return (
    isKenyaAddress(address) &&
    Boolean(address.county) &&
    Boolean(address.sub_county) &&
    Boolean(address.location) &&
    Boolean(address.sub_location)
  );
}

/**
 * Compose a single location / delivery_address string.
 * Order is street → admin units → postal → country (most-specific first).
 */
export function composeDeliveryAddress(address = {}) {
  const parts = [];
  if (address.address_line1) parts.push(String(address.address_line1).trim());
  if (address.address_line2) parts.push(String(address.address_line2).trim());
  if (isKenyaAddress(address)) {
    if (address.sub_location) parts.push(String(address.sub_location).trim());
    if (address.location) parts.push(String(address.location).trim());
    if (address.sub_county) parts.push(String(address.sub_county).trim());
    if (address.county) parts.push(`${String(address.county).trim()} County`);
  } else if (address.county) {
    parts.push(String(address.county).trim());
  }
  if (address.postal_code) parts.push(String(address.postal_code).trim());
  const country =
    address.country_name || countryNameFromCode(address.country_code);
  if (country) parts.push(country);
  return parts.filter(Boolean).join(', ');
}

/**
 * Validate structured address for delivery or seller base.
 * Kenya: admin hierarchy required; street/landmark optional once admin is complete.
 * Other countries: city/region + address line 1 required.
 * @returns {string|null} error message or null if ok
 */
export function validateDeliveryAddress(address, { required = true } = {}) {
  if (!required) return null;
  if (!address?.country_code) return 'Please select your country';
  if (isKenyaAddress(address)) {
    if (!address.county) return 'Please select County / District';
    if (!address.sub_county) return 'Please select Sub-county / Division';
    if (!address.location) return 'Please select Location';
    if (!address.sub_location) return 'Please select Sub-location';
    return null;
  }
  if (!String(address.county || '').trim()) {
    return 'Please enter city / region';
  }
  if (!String(address.address_line1 || '').trim()) {
    return 'Please enter Address line 1 (street / estate / landmark)';
  }
  return null;
}

/** Map a seller DB row into AddressFields value shape. */
export function sellerToAddress(seller = {}) {
  return {
    ...EMPTY_ADDRESS,
    country_code: seller.country_code || '',
    country_name: seller.country_name || '',
    address_line1: seller.address_line1 || '',
    address_line2: seller.address_line2 || '',
    postal_code: seller.postal_code || '',
    county: seller.county || '',
    sub_county: seller.sub_county || '',
    location: seller.admin_location || '',
    sub_location: seller.sub_location || '',
    latitude: seller.latitude != null ? Number(seller.latitude) : null,
    longitude: seller.longitude != null ? Number(seller.longitude) : null,
  };
}

/** Flatten AddressFields value into seller API / DB fields. */
export function addressToSellerPayload(address = {}) {
  const a = { ...EMPTY_ADDRESS, ...address };
  return {
    country_code: a.country_code || null,
    country_name: a.country_name || countryNameFromCode(a.country_code) || null,
    address_line1: a.address_line1 || null,
    address_line2: a.address_line2 || null,
    postal_code: a.postal_code || null,
    county: a.county || null,
    sub_county: a.sub_county || null,
    admin_location: a.location || null,
    sub_location: a.sub_location || null,
    latitude: a.latitude,
    longitude: a.longitude,
    location: composeDeliveryAddress(a) || null,
  };
}

/** Compact one-line summary for tables. Empty string when nothing useful. */
export function formatAddressShort(addressOrOrder = {}) {
  if (addressOrOrder.county && addressOrOrder.sub_county) {
    return [
      addressOrOrder.sub_location,
      addressOrOrder.admin_location || addressOrOrder.location,
      addressOrOrder.county,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (addressOrOrder.county) return addressOrOrder.county;
  if (addressOrOrder.location && !addressOrOrder.admin_location) {
    // sellers.location composed string, or free-text legacy
    const s = String(addressOrOrder.location);
    if (s.length > 2 && !addressOrOrder.country_code) {
      return s.length > 60 ? `${s.slice(0, 57)}…` : s;
    }
  }
  if (addressOrOrder.delivery_address) {
    const s = String(addressOrOrder.delivery_address);
    return s.length > 60 ? `${s.slice(0, 57)}…` : s;
  }
  return '';
}

/** Multi-line display blocks for order / seller detail. */
export function formatAddressLines(addressOrOrder = {}) {
  const lines = [];
  if (addressOrOrder.address_line1) lines.push(addressOrOrder.address_line1);
  if (addressOrOrder.address_line2) lines.push(addressOrOrder.address_line2);
  const adminLocation = addressOrOrder.admin_location || addressOrOrder.location;
  if (isKenyaAddress(addressOrOrder) || addressOrOrder.sub_county) {
    const admin = [
      addressOrOrder.sub_location,
      addressOrOrder.admin_location ? adminLocation : addressOrOrder.location,
      addressOrOrder.sub_county,
      addressOrOrder.county,
    ]
      .filter(Boolean)
      .join(', ');
    if (admin) lines.push(admin);
  } else if (addressOrOrder.county) {
    lines.push(addressOrOrder.county);
  }
  if (addressOrOrder.postal_code) {
    lines.push(`Postal: ${addressOrOrder.postal_code}`);
  }
  const country =
    addressOrOrder.country_name ||
    countryNameFromCode(addressOrOrder.country_code);
  if (country) lines.push(country);
  if (!lines.length && addressOrOrder.delivery_address) {
    lines.push(addressOrOrder.delivery_address);
  }
  if (!lines.length && addressOrOrder.location && !addressOrOrder.admin_location) {
    lines.push(addressOrOrder.location);
  }
  return lines;
}

let kenyaCache = null;

/** Lazy-load Kenya location tree from public JSON. */
export async function loadKenyaLocations() {
  if (kenyaCache) return kenyaCache;
  const res = await fetch(`${process.env.PUBLIC_URL || ''}/data/kenya-locations.json`);
  if (!res.ok) throw new Error('Could not load Kenya location data');
  kenyaCache = await res.json();
  return kenyaCache;
}

export function filterOptions(options, query) {
  const q = String(query || '')
    .trim()
    .toUpperCase();
  if (!q) return options;
  return options.filter((o) => String(o).toUpperCase().includes(q));
}
