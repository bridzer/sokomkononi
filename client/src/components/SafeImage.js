import React, { useState } from 'react';

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80';

/**
 * Image wrapper that swaps to a fallback when the src 404s or fails to load.
 * Prevents broken-image icons when Railway redeploys wipe the uploads volume.
 */
export default function SafeImage({
  src,
  alt = '',
  fallback = DEFAULT_FALLBACK,
  className = '',
  ...rest
}) {
  const [current, setCurrent] = useState(src || fallback);
  const [failed, setFailed] = useState(false);

  // Reset when the product/image changes upstream.
  const key = src || '';
  React.useEffect(() => {
    setCurrent(src || fallback);
    setFailed(false);
  }, [key, src, fallback]);

  const onError = () => {
    if (failed) return;
    setFailed(true);
    if (current !== fallback) setCurrent(fallback);
  };

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={onError}
      loading={rest.loading || 'lazy'}
      {...rest}
    />
  );
}

export { DEFAULT_FALLBACK };
