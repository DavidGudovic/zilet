'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function PageAtmosphere() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith('/redakcija') || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.lead-story > h1, .lead-excerpt, .poem-selection > h2, .poem-excerpt, .front-art-feature article, .archive-entry > div, .prose > p, .prose > h2, .editorial-note, .author-bio > p, .index-row, .group-poem, .group-prose, .ink-lines',
      ),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.remove('ink-pending');
            entry.target.classList.add('ink-arrived');
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0, rootMargin: '0px 0px -35px 0px' },
    );
    for (const element of elements) {
      // Server-rendered text stays visible without JS; only off-screen items receive an entrance.
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('ink-reveal', 'ink-pending');
        observer.observe(element);
      }
    }
    const clear = () => {
      observer.disconnect();
      elements.forEach((element) =>
        element.classList.remove('ink-pending', 'ink-reveal', 'ink-arrived'),
      );
    };
    preference.addEventListener('change', clear);
    return () => {
      clear();
      preference.removeEventListener('change', clear);
    };
  }, [path]);
  return null;
}
