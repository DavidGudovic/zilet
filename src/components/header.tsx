'use client';
import { Link } from './link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Arrow, Chevron } from './arrow';
import { rubrics } from '@/lib/content';
// The full-size wordmark is 1881 px wide; these cover the masthead at up to three device pixels.
const wordmark = '/identity/wordmark-generated-549.webp';
const wordmarkSet = [279, 549, 828]
  .map((w) => `/identity/wordmark-generated-${w}.webp ${w}w`)
  .join(', ');
export function Header({ isEditor = false }: { isEditor?: boolean }) {
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
          <img
            src={wordmark}
            srcSet={wordmarkSet}
            sizes="(max-width: 359px) 140px, (max-width: 767px) 174px, 250px"
            width="1881"
            height="836"
            alt="Žilet"
          />
        </Link>
      </div>
      <div className="nav-rule">
        <nav className="main-nav wrap" aria-label="Glavna navigacija">
          <Link className="nav-home" href="/" aria-label="Početna">
            <svg width="20" height="28" viewBox="100 60 575 715" aria-hidden="true">
              <defs>
                <clipPath id="nav-logo-z">
                  {/* Frame the original Ž while excluding the neighbouring i's serifs. */}
                  <path d="M100 60H653V540H675V680H644V775H100Z" />
                </clipPath>
              </defs>
              <image
                href="/identity/wordmark-generated-279.webp"
                width="1881"
                height="836"
                clipPath="url(#nav-logo-z)"
              />
            </svg>
          </Link>
          <div className="primary-links">
            <Link
              href="/rubrika/poezija"
              aria-current={path === '/rubrika/poezija' ? 'page' : undefined}
            >
              Poezija
            </Link>
            <Link
              href="/rubrika/proza"
              aria-current={
                path === '/rubrika/proza' || path === '/rubrika/price' ? 'page' : undefined
              }
            >
              Proza
            </Link>
            <Link
              href="/rubrika/eseji"
              aria-current={path === '/rubrika/eseji' ? 'page' : undefined}
            >
              Eseji
            </Link>
            <Link
              href="/rubrika/umjetnost"
              aria-current={
                ['umjetnost', 'slikarstvo', 'muzika', 'film'].some((s) => path === `/rubrika/${s}`)
                  ? 'page'
                  : undefined
              }
            >
              Umjetnost
            </Link>
          </div>
          <button
            ref={trigger}
            className="rubric-toggle"
            aria-expanded={open}
            aria-controls="rubric-menu"
            onClick={() => setOpen(!open)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          >
            Sve rubrike <Chevron open={open} />
          </button>
          <div className="nav-tools">
            <Link
              className="nav-about"
              href="/o-casopisu"
              aria-current={path === '/o-casopisu' ? 'page' : undefined}
            >
              O časopisu
            </Link>
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
            <Link href="/nalog" aria-current={path === '/nalog' ? 'page' : undefined}>
              Nalog
            </Link>
            {isEditor && (
              <Link className="editor-entry" href="/redakcija#radni-prostor">
                Redakcija
              </Link>
            )}
          </div>
        </nav>
      </div>
      {/* Rendered while closed so crawlers find every rubric link; hidden keeps it out of view. */}
      <div
        className="menu-sheet"
        id="rubric-menu"
        hidden={!open}
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
            {rubrics
              .filter(([slug]) => slug !== 'price')
              .map(([slug, label]) => (
                <Link
                  key={slug}
                  href={`/rubrika/${slug}`}
                  aria-current={path === `/rubrika/${slug}` ? 'page' : undefined}
                >
                  {label}
                  <span aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
              ))}
          </div>
          <div className="menu-bottom">
            <Link href="/autori">Autori</Link>
            <Link href="/o-casopisu">O časopisu</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  const path = usePathname();
  if (path.startsWith('/redakcija')) return null;
  return (
    <div className="footer-surface">
      <footer className="footer wrap">
        <Link href="/" aria-label="Žilet — Početna">
          <img
            src={wordmark}
            srcSet={wordmarkSet}
            sizes="100px"
            width="100"
            height="45"
            alt="Žilet"
            loading="lazy"
          />
        </Link>
        <p>Časopis za književnost, umjetnost i kulturu</p>
        <div>
          <Link href="/autori">Autori</Link>
          <Link href="/o-casopisu">O časopisu</Link>
          <Link href="/pravila">Pravila i privatnost</Link>
          <Link href="/posalji">Pošaljite rad</Link>
        </div>
        <a className="maker-credit" href="https://www.linkedin.com/in/david-gudovic/">
          Made with{' '}
          <svg
            width="19"
            height="22"
            viewBox="0 0 24 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            aria-hidden="true"
          >
            <path
              d="M4 25C8 17 13 10 20 3M7 19C3 11 11 3 21 2C21 11 17 18 7 19ZM10 15L9 10M14 10L19 9M6 23L11 22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>{' '}
          by David Gudović
        </a>
        <a href="#vrh" className="to-top">
          Na vrh <Arrow to="up" />
        </a>
      </footer>
    </div>
  );
}
