'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { rubrics } from '@/lib/content';
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  if (path.startsWith('/redakcija')) return null;
  return (
    <header className="site-header">
      <div className="masthead wrap">
        <p className="descriptor">
          Časopis za književnost,
          <br />
          umjetnost i kulturu
        </p>
        <Link href="/" className="brand" aria-label="Žilet — Početna">
          <img src="/identity/wordmark-green.svg" width="380" height="168" alt="Žilet" />
        </Link>
        <div className="masthead-right">
          <span>Književnost i umjetnost</span>
          <Link href="/o-casopisu">
            O časopisu <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <div className="nav-rule">
        <nav className="main-nav wrap" aria-label="Glavna navigacija">
          <Link className="nav-home" href="/" aria-label="Početna">
            <img src="/identity/monogram-green.svg" width="19" height="28" alt="Ž" />
          </Link>
          <div className="primary-links">
            <Link
              href="/rubrika/poezija"
              aria-current={path === '/rubrika/poezija' ? 'page' : undefined}
            >
              Poezija
            </Link>
            <Link
              href="/rubrika/knjizevna-kritika"
              aria-current={path === '/rubrika/knjizevna-kritika' ? 'page' : undefined}
            >
              Književna kritika
            </Link>
            <Link href="/rubrika/proza">Proza</Link>
            <Link href="/rubrika/eseji">Eseji</Link>
            <Link href="/rubrika/umjetnost">Umjetnost</Link>
          </div>
          <button
            ref={trigger}
            className="rubric-toggle"
            aria-expanded={open}
            aria-controls="rubric-menu"
            onClick={() => setOpen(!open)}
          >
            Sve rubrike{' '}
            <span className={open ? 'rotated' : ''} aria-hidden="true">
              +
            </span>
          </button>
          <div className="nav-tools">
            <Link href="/pretraga" aria-label="Pretraga">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
              <span>Pretraga</span>
            </Link>
            <Link href="/nalog">Nalog</Link>
          </div>
        </nav>
      </div>
      {open && (
        <div
          className="menu-sheet"
          id="rubric-menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          <div className="wrap menu-inner">
            <p className="eyebrow">Rubrike</p>
            <div className="rubric-grid">
              <Link href="/">Početna</Link>
              {rubrics.map(([slug, label]) => (
                <Link key={slug} href={`/rubrika/${slug}`}>
                  {label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
            <div className="menu-bottom">
              <Link href="/autori">Autori</Link>
              <Link href="/o-casopisu">O časopisu</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
export function Footer() {
  const path = usePathname();
  if (path.startsWith('/redakcija')) return null;
  return (
    <footer className="footer wrap">
      <Link href="/" aria-label="Žilet — Početna">
        <img src="/identity/wordmark-green.svg" width="100" height="45" alt="Žilet" />
      </Link>
      <p>Časopis za književnost, umjetnost i kulturu</p>
      <div>
        <Link href="/autori">Autori</Link>
        <Link href="/o-casopisu">O časopisu</Link>
        <Link href="/pravila">Pravila i privatnost</Link>
        <Link href="/redakcija">Redakcija</Link>
      </div>
      <a href="#vrh" className="to-top">
        Na vrh ↑
      </a>
    </footer>
  );
}
