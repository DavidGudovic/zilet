'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { publicAnalyticsPath, analyticsReferrer } from '@/lib/analytics-privacy';
const cacheKey = 'zilet-umami-cache';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const last = useRef('');

  useEffect(() => {
    if (last.current === pathname) return;
    const firstPage = last.current === '';
    last.current = pathname;
    if (!publicAnalyticsPath.test(pathname)) return;
    if (
      navigator.doNotTrack === '1' ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
    )
      return;

    const send = async () => {
      try {
        const referrer = firstPage ? analyticsReferrer(document.referrer, location.origin) : '';
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
            referrer,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            cache,
          }),
          keepalive: true,
        });
        if (!response.ok || response.status === 204) return;
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
