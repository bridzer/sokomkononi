import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTRY_OPTIONS, countryNameFromCode } from '../utils/address';

/**
 * Detect country via IP (no permission) and optionally browser geolocation (coords).
 * Never blocks the form — user can always pick manually.
 */
export default function useDetectCountry({ auto = true } = {}) {
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [coords, setCoords] = useState(null);
  const [source, setSource] = useState(''); // ip | geo | manual
  const [status, setStatus] = useState('idle'); // idle | detecting | ready | denied | error
  const [message, setMessage] = useState('');
  const tried = useRef(false);

  const applyCountry = useCallback((code, name, src) => {
    const normalized = String(code || '').toUpperCase();
    const known = COUNTRY_OPTIONS.find((c) => c.code === normalized);
    const finalCode = known ? known.code : normalized || 'OTHER';
    const finalName = name || known?.name || countryNameFromCode(finalCode) || finalCode;
    setCountryCode(finalCode === 'KENYA' ? 'KE' : finalCode);
    setCountryName(finalName);
    setSource(src);
    setStatus('ready');
  }, []);

  const detectFromIp = useCallback(async () => {
    setStatus('detecting');
    setMessage('Detecting your country…');
    try {
      // ipwho.is — no API key, CORS-friendly
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data?.success && data.country_code) {
        applyCountry(data.country_code, data.country, 'ip');
        setMessage(`Country set from your network: ${data.country}`);
        return { code: data.country_code, name: data.country };
      }
      throw new Error('IP lookup unsuccessful');
    } catch {
      setStatus('error');
      setMessage('Could not detect country automatically. Please select it below.');
      return null;
    }
  }, [applyCountry]);

  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage('Location is not supported in this browser. Select country manually.');
      setStatus('denied');
      return;
    }
    setStatus('detecting');
    setMessage('Requesting location access…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        // Keep IP/manual country if already set; coords help delivery distance later
        if (!countryCode) {
          await detectFromIp();
        } else {
          setStatus('ready');
        }
        setMessage('Location coordinates saved for delivery distance.');
        setSource((s) => s || 'geo');
      },
      () => {
        setStatus('denied');
        setMessage('Location access denied. You can still enter your address manually.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [countryCode, detectFromIp]);

  const setManualCountry = useCallback(
    (code) => {
      applyCountry(code, countryNameFromCode(code), 'manual');
      setMessage('');
    },
    [applyCountry]
  );

  useEffect(() => {
    if (!auto || tried.current) return;
    tried.current = true;
    detectFromIp();
  }, [auto, detectFromIp]);

  return {
    countryCode,
    countryName,
    coords,
    source,
    status,
    message,
    detectFromIp,
    requestBrowserLocation,
    setManualCountry,
    setCountryCode: setManualCountry,
  };
}
