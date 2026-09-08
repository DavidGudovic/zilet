'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
export function DeskNavigation() {
  const path = usePathname();
  useEffect(() => {
    if (location.hash !== '#radni-prostor') return;
    const root = document.getElementById('radni-prostor');
    const target =
      root?.querySelector<HTMLElement>('[data-next-step] [role=combobox]') ||
      root?.querySelector<HTMLElement>('[data-next-step], h1') ||
      root;
    if (target) {
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ block: 'start' });
    }
  }, [path]);
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
