'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
export function AnalyticsTracker() {
  const pathname = usePathname();
  const last = useRef('');
  useEffect(() => {
    if (
      last.current === pathname ||
      !/^\/$|^\/(tekst|rubrika|autor)\/[^/]+$|^\/(autori|o-casopisu)$/.test(pathname)
    )
      return;
    last.current = pathname;
    let referrer = '';
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        if (ref.origin !== location.origin) referrer = ref.origin;
      }
    } catch {}
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referrer,
        screen: `${screen.width}x${screen.height}`,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
