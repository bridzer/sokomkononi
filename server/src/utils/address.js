function isKenya(code) {
  return String(code || '').toUpperCase() === 'KE';
}

function str(v, max = 240) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function hasCompleteKenyaAdmin(fields = {}) {
  return (
    isKenya(fields.country_code) &&
    Boolean(fields.county) &&
    Boolean(fields.sub_county) &&
    Boolean(fields.location) &&
    Boolean(fields.sub_location)
  );
}

function composeDeliveryAddress(a = {}) {
  const parts = [];
  if (a.address_line1) parts.push(a.address_line1);
  if (a.address_line2) parts.push(a.address_line2);
  if (isKenya(a.country_code)) {
    if (a.sub_location) parts.push(a.sub_location);
    if (a.location) parts.push(a.location);
    if (a.sub_county) parts.push(a.sub_county);
    if (a.county) parts.push(`${a.county} County`);
  } else if (a.county) {
    parts.push(a.county);
  }
  if (a.postal_code) parts.push(a.postal_code);
  if (a.country_name) parts.push(a.country_name);
  else if (a.country_code) parts.push(a.country_code);
  return parts.filter(Boolean).join(', ');
}

function parseCoords(body = {}) {
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return {
      latitude: Math.round(lat * 1e7) / 1e7,
      longitude: Math.round(lng * 1e7) / 1e7,
    };
  }
  return { latitude: null, longitude: null };
}

/**
 * Normalize + validate structured address from order payload.
 * Kenya: admin hierarchy required; address_line1 optional once admin is complete.
 */
function normalizeOrderAddress(body = {}, { required = false } = {}) {
  const coords = parseCoords(body);
  const fields = {
    country_code: str(body.country_code, 8)?.toUpperCase() || null,
    country_name: str(body.country_name, 120),
    address_line1: str(body.address_line1, 240),
    address_line2: str(body.address_line2, 240),
    postal_code: str(body.postal_code, 32),
    county: str(body.county, 120),
    sub_county: str(body.sub_county, 120),
    location: str(body.location, 120),
    sub_location: str(body.sub_location, 120),
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  if (required) {
    if (!fields.country_code) {
      return { ok: false, error: 'country is required for delivery' };
    }
    if (isKenya(fields.country_code)) {
      if (!fields.county) return { ok: false, error: 'county / district is required' };
      if (!fields.sub_county) return { ok: false, error: 'sub_county / division is required' };
      if (!fields.location) return { ok: false, error: 'location is required' };
      if (!fields.sub_location) return { ok: false, error: 'sub_location is required' };
    } else {
      if (!fields.county) return { ok: false, error: 'city / region is required' };
      if (!fields.address_line1) {
        return { ok: false, error: 'address_line1 is required for delivery' };
      }
    }
  }

  const composed = composeDeliveryAddress(fields);
  const legacy = str(body.delivery_address, 2000);
  fields.delivery_address = composed || legacy || null;

  return { ok: true, fields };
}

/**
 * Normalize seller base location.
 * Clients send AddressFields shape (`location` = Kenya LOCATION unit).
 * DB: admin_location = that unit; location = composed display string.
 */
function normalizeSellerAddress(body = {}, { required = false } = {}) {
  const coords = parseCoords(body);
  const hasStructuredKeys =
    body.country_code != null ||
    body.county != null ||
    body.sub_county != null ||
    body.sub_location != null ||
    body.admin_location != null ||
    body.address_line1 != null ||
    body.address_line2 != null ||
    body.postal_code != null;

  const adminLocation = str(body.admin_location, 120) || (hasStructuredKeys ? str(body.location, 120) : null);

  const fields = {
    country_code: str(body.country_code, 8)?.toUpperCase() || null,
    country_name: str(body.country_name, 120),
    address_line1: str(body.address_line1, 240),
    address_line2: str(body.address_line2, 240),
    postal_code: str(body.postal_code, 32),
    county: str(body.county, 120),
    sub_county: str(body.sub_county, 120),
    admin_location: adminLocation,
    sub_location: str(body.sub_location, 120),
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  if (required) {
    if (!fields.country_code) {
      return { ok: false, error: 'country is required' };
    }
    if (isKenya(fields.country_code)) {
      if (!fields.county) return { ok: false, error: 'county / district is required' };
      if (!fields.sub_county) return { ok: false, error: 'sub_county / division is required' };
      if (!fields.admin_location) return { ok: false, error: 'location is required' };
      if (!fields.sub_location) return { ok: false, error: 'sub_location is required' };
    } else {
      if (!fields.county) return { ok: false, error: 'city / region is required' };
      if (!fields.address_line1) {
        return { ok: false, error: 'address line 1 is required' };
      }
    }
  }

  const composed = composeDeliveryAddress({
    ...fields,
    location: fields.admin_location,
  });

  if (hasStructuredKeys) {
    fields.location = composed || null;
  } else if (body.location !== undefined) {
    fields.location = str(body.location, 500);
  } else {
    fields.location = composed || null;
  }

  return { ok: true, fields };
}

module.exports = {
  composeDeliveryAddress,
  normalizeOrderAddress,
  normalizeSellerAddress,
  hasCompleteKenyaAdmin,
  isKenya,
};
