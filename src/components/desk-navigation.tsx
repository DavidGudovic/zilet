'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
export function DeskNavigation() {
  const path = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => {
    if (location.hash !== '#radni-prostor') return;
    const root = document.getElementById('radni-prostor');
    const target =
      root?.querySelector<HTMLElement>('[data-next-step] [role=combobox]') ||
      root?.querySelector<HTMLElement>('[data-next-step]') ||
      root?.querySelector<HTMLElement>('h1') ||
      root;
    if (target) {
      if (!target.matches('input, select, textarea, button, a[href], [tabindex]'))
        target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ block: 'start' });
    }
  }, [path, query]);
  return (
    <nav className="desk-nav" aria-label="Redakcija">
      {[
        ['/redakcija', 'Tekstovi'],
        ['/redakcija/prilozi', 'Prilozi čitalaca'],
        ['/redakcija/fotografije', 'Fotografije'],
        ['/redakcija/komentari', 'Komentari'],
        ['/redakcija/autori', 'Autori'],
        ['/redakcija/statistika', 'Statistika'],
        ['/redakcija/pomoc', 'Pomoć'],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={`${href}#radni-prostor`}
          aria-current={path === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
      <Link className="button" href="/redakcija/novi#radni-prostor">
        + Novi tekst
      </Link>
    </nav>
  );
}
