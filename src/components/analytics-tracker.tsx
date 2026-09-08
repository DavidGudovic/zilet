'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const publicPath = /^\/$|^\/(tekst|rubrika|autor)\/[a-z0-9-]+$|^\/(autori|o-casopisu)$/;
const cacheKey = 'zilet-umami-cache';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const last = useRef('');

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (!publicPath.test(pathname)) return;

    const send = async () => {
      try {
        let referrer = '';
        try {
          referrer = document.referrer ? new URL(document.referrer).origin : '';
        } catch {
          // An invalid referrer must not stop a public pageview.
        }
        let cache = '';
        try {
          cache = sessionStorage.getItem(cacheKey) || '';
        } catch {
          // Private browsing or storage settings must not stop a pageview.
        }
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathname,
            referrer: referrer === location.origin ? '' : referrer,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            cache,
          }),
          keepalive: true,
        });
        const data = (await response.json()) as { cache?: unknown };
        if (typeof data.cache === 'string' && data.cache) {
          try {
            sessionStorage.setItem(cacheKey, data.cache);
          } catch {
            // The cache only improves session continuity.
          }
        }
      } catch {
        // Analytics must never interfere with reading.
      }
    };
    void send();
  }, [pathname]);

  return null;
}
