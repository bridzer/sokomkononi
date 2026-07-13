import React, { useMemo } from 'react';
import { BUSINESS, MAP_CONFIG } from '../utils/format';

function buildEmbedUrl({ apiKey, lat, lng, zoom, query }) {
  if (!apiKey) return null;
  const q =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `${lat},${lng}`
      : encodeURIComponent(query || BUSINESS.location);
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}&zoom=${zoom}`;
}

function buildDirectionsUrl({ lat, lng, query }) {
  const destination =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `${lat},${lng}`
      : encodeURIComponent(query || BUSINESS.location);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

function buildSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query || BUSINESS.location
  )}`;
}

export default function GoogleMapSection() {
  const embedUrl = useMemo(() => buildEmbedUrl(MAP_CONFIG), []);
  const directionsUrl = useMemo(() => buildDirectionsUrl(MAP_CONFIG), []);
  const searchUrl = useMemo(() => buildSearchUrl(MAP_CONFIG.query), []);

  const hasKey = Boolean(MAP_CONFIG.apiKey);

  return (
    <section className="bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-stretch">
          {/* Map */}
          <div className="card overflow-hidden min-h-[260px] sm:min-h-[360px]">
            {hasKey ? (
              <iframe
                title={MAP_CONFIG.title}
                src={embedUrl}
                className="w-full h-full min-h-[260px] sm:min-h-[360px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="h-full min-h-[260px] sm:min-h-[360px] grid place-items-center p-6 text-center bg-slate-50">
                <div>
                  <div className="text-4xl mb-3" aria-hidden="true">
                    📍
                  </div>
                  <p className="font-semibold text-slate-800">{MAP_CONFIG.title}</p>
                  <p className="text-sm text-slate-600 mt-2">{BUSINESS.location}</p>
                  <p className="text-xs text-slate-500 mt-3 max-w-sm mx-auto">
                    Add <code className="text-brand-700">REACT_APP_GOOGLE_MAPS_API_KEY</code> to{' '}
                    <code className="text-brand-700">client/.env</code> to show the interactive map.
                  </p>
                  <a
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex mt-4 text-sm"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="flex flex-col justify-center">
            <span className="text-xs uppercase tracking-wider text-brand-600 font-semibold">
              Location
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              {MAP_CONFIG.title}
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base leading-relaxed">
              {MAP_CONFIG.description}
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex gap-3 items-start">
                <span className="text-lg shrink-0" aria-hidden="true">
                  📍
                </span>
                <div>
                  <div className="font-medium text-slate-800">Address</div>
                  <div className="text-slate-600">{BUSINESS.location}</div>
                </div>
              </div>
              {MAP_CONFIG.hours && (
                <div className="flex gap-3 items-start">
                  <span className="text-lg shrink-0" aria-hidden="true">
                    🕐
                  </span>
                  <div>
                    <div className="font-medium text-slate-800">Hours</div>
                    <div className="text-slate-600 whitespace-pre-line">{MAP_CONFIG.hours}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm py-2.5 justify-center"
              >
                Get directions
              </a>
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-sm py-2.5 justify-center"
              >
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
