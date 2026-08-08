import React, { useEffect, useMemo, useState } from 'react';
import {
  COUNTRY_OPTIONS,
  EMPTY_ADDRESS,
  countryNameFromCode,
  hasCompleteKenyaAdmin,
  isKenyaAddress,
  loadKenyaLocations,
} from '../utils/address';
import useDetectCountry from '../hooks/useDetectCountry';
import SearchableSelect from './SearchableSelect';

/**
 * Structured address form (checkout delivery + seller base).
 * Flow: Country → (Kenya admin highest→lowest) → street / landmarks → postal.
 * Kenya: Address line 1 becomes optional landmarks once admin units are complete.
 */
export default function AddressFields({
  value,
  onChange,
  required = true,
  showDetect = true,
  idPrefix = 'addr',
  title = 'Delivery address',
  description = 'Structured so we can route and estimate delivery distance accurately.',
}) {
  const address = { ...EMPTY_ADDRESS, ...value };
  const geo = useDetectCountry({ auto: true });
  const [kenyaData, setKenyaData] = useState(null);
  const [kenyaError, setKenyaError] = useState('');
  const [loadingKenya, setLoadingKenya] = useState(false);

  const patch = (partial) => {
    const next = { ...address, ...partial };
    if (partial.country_code != null) {
      next.country_name =
        partial.country_name || countryNameFromCode(partial.country_code);
    }
    onChange?.(next);
  };

  useEffect(() => {
    if (!address.country_code && geo.countryCode) {
      patch({
        country_code: geo.countryCode,
        country_name: geo.countryName,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.countryCode]);

  useEffect(() => {
    if (geo.coords?.latitude != null) {
      patch({
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords]);

  useEffect(() => {
    if (!isKenyaAddress(address)) return;
    if (kenyaData || loadingKenya) return;
    setLoadingKenya(true);
    loadKenyaLocations()
      .then((data) => setKenyaData(data))
      .catch(() => setKenyaError('Could not load Kenya location list. Refresh and try again.'))
      .finally(() => setLoadingKenya(false));
  }, [address.country_code, kenyaData, loadingKenya]);

  const countyOptions = kenyaData?.counties || [];
  const divisionOptions = useMemo(() => {
    if (!kenyaData || !address.county) return [];
    return Object.keys(kenyaData.tree[address.county] || {}).sort();
  }, [kenyaData, address.county]);

  const locationOptions = useMemo(() => {
    if (!kenyaData || !address.county || !address.sub_county) return [];
    return Object.keys(kenyaData.tree[address.county]?.[address.sub_county] || {}).sort();
  }, [kenyaData, address.county, address.sub_county]);

  const subLocationOptions = useMemo(() => {
    if (!kenyaData || !address.county || !address.sub_county || !address.location) return [];
    return (
      kenyaData.tree[address.county]?.[address.sub_county]?.[address.location] || []
    ).slice();
  }, [kenyaData, address.county, address.sub_county, address.location]);

  const kenya = isKenyaAddress(address);
  const kenyaAdminDone = hasCompleteKenyaAdmin(address);
  // Kenya: street optional after admin complete. Elsewhere: required when form is required.
  const line1Required = required && !kenya;
  const showStreetBlock = kenya ? kenyaAdminDone : Boolean(address.country_code);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description ? (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          ) : null}
        </div>
        {showDetect && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost text-xs py-1.5 px-2.5"
              onClick={() => geo.detectFromIp()}
            >
              Detect country
            </button>
            <button
              type="button"
              className="btn-outline text-xs py-1.5 px-2.5"
              onClick={() => geo.requestBrowserLocation()}
            >
              Use my location
            </button>
          </div>
        )}
      </div>

      {geo.message ? (
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            geo.status === 'error' || geo.status === 'denied'
              ? 'bg-amber-50 text-amber-900 border border-amber-100'
              : 'bg-brand-50 text-brand-900 border border-brand-100'
          }`}
        >
          {geo.message}
          {address.latitude != null ? (
            <span className="block mt-0.5 text-[11px] opacity-80">
              GPS: {Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}
            </span>
          ) : null}
        </p>
      ) : null}

      <div>
        <label className="label" htmlFor={`${idPrefix}-country`}>
          Country {required ? '*' : ''}
        </label>
        <select
          id={`${idPrefix}-country`}
          className="input w-full"
          required={required}
          value={address.country_code || ''}
          onChange={(e) => {
            const code = e.target.value;
            patch({
              country_code: code,
              country_name: countryNameFromCode(code),
              county: '',
              sub_county: '',
              location: '',
              sub_location: '',
            });
            geo.setManualCountry(code);
          }}
        >
          <option value="">Select country…</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {kenya ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-brand-800 uppercase tracking-wider">
            Kenya administrative area
          </p>
          <p className="text-[11px] text-slate-600">
            Choose from highest to lowest: County → Sub-county → Location → Sub-location.
          </p>
          {loadingKenya && (
            <p className="text-xs text-slate-500">Loading counties &amp; locations…</p>
          )}
          {kenyaError && <p className="text-xs text-red-600">{kenyaError}</p>}

          <SearchableSelect
            label="County / District"
            required={required}
            disabled={!kenyaData}
            options={countyOptions}
            value={address.county || ''}
            placeholder="Type e.g. BARINGO…"
            helper="Start typing to filter. Choosing a county unlocks the next field."
            onChange={(county) =>
              patch({
                county,
                sub_county: '',
                location: '',
                sub_location: '',
              })
            }
          />

          <SearchableSelect
            label="Sub-county / Division"
            required={required}
            disabled={!address.county}
            options={divisionOptions}
            value={address.sub_county || ''}
            placeholder={address.county ? 'Select or search…' : 'Select county first'}
            onChange={(sub_county) =>
              patch({
                sub_county,
                location: '',
                sub_location: '',
              })
            }
          />

          <SearchableSelect
            label="Location"
            required={required}
            disabled={!address.sub_county}
            options={locationOptions}
            value={address.location || ''}
            placeholder={address.sub_county ? 'Select…' : 'Select sub-county first'}
            onChange={(location) =>
              patch({
                location,
                sub_location: '',
              })
            }
          />

          <SearchableSelect
            label="Sub-location"
            required={required}
            disabled={!address.location}
            options={subLocationOptions}
            value={address.sub_location || ''}
            placeholder={address.location ? 'Select…' : 'Select location first'}
            onChange={(sub_location) => patch({ sub_location })}
          />
        </div>
      ) : address.country_code ? (
        <div>
          <label className="label" htmlFor={`${idPrefix}-region`}>
            City / Region {required ? '*' : ''}
          </label>
          <input
            id={`${idPrefix}-region`}
            className="input w-full"
            required={required}
            value={address.county || ''}
            onChange={(e) => patch({ county: e.target.value })}
            placeholder="City, region, or province"
            autoComplete="address-level1"
          />
        </div>
      ) : null}

      {showStreetBlock ? (
        <div className="space-y-4">
          {kenya && kenyaAdminDone ? (
            <p className="text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              Area selected. Optionally add a landmark or building so riders can find you faster.
            </p>
          ) : null}

          <div>
            <label className="label" htmlFor={`${idPrefix}-line1`}>
              {kenya
                ? `Landmark / building${line1Required ? ' *' : ' (optional)'}`
                : `Address line 1${line1Required ? ' *' : ''}`}
            </label>
            <input
              id={`${idPrefix}-line1`}
              className="input w-full"
              required={line1Required}
              value={address.address_line1 || ''}
              onChange={(e) => patch({ address_line1: e.target.value })}
              placeholder={
                kenya
                  ? 'e.g. Near ABC school, Green Plaza gate B, plot 12…'
                  : 'Street, estate, building, plot, or landmark'
              }
              autoComplete="address-line1"
            />
          </div>

          <div>
            <label className="label" htmlFor={`${idPrefix}-line2`}>
              {kenya ? 'Extra directions (optional)' : 'Address line 2'}
            </label>
            <input
              id={`${idPrefix}-line2`}
              className="input w-full"
              value={address.address_line2 || ''}
              onChange={(e) => patch({ address_line2: e.target.value })}
              placeholder="Apartment, floor, gate colour, or other notes"
              autoComplete="address-line2"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor={`${idPrefix}-postal`}>
                Postal / ZIP code
              </label>
              <input
                id={`${idPrefix}-postal`}
                className="input w-full"
                value={address.postal_code || ''}
                onChange={(e) => patch({ postal_code: e.target.value })}
                placeholder={kenya ? 'e.g. 00100 (optional)' : 'Postal or ZIP'}
                autoComplete="postal-code"
              />
            </div>
          </div>
        </div>
      ) : kenya && address.country_code ? (
        <p className="text-xs text-slate-500">
          Complete the administrative area above, then you can add a landmark if needed.
        </p>
      ) : null}
    </div>
  );
}
