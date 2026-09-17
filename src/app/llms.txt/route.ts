import { rubrics } from '@/lib/content';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export function GET() {
  const link = (title: string, path: string, summary: string) =>
    `- [${title}](${absoluteUrl(path)}): ${summary}`;
  const text = [
    '# Žilet',
    '',
    '> Žilet je časopis za književnost, umjetnost i kulturu. Objavljuje poeziju, prozu, eseje, priloge o umjetnosti i radove čitalaca.',
    '',
    'Tekstovi zadržavaju jezik, pismo i izraz svojih autora. Čitanje objavljenih radova je otvoreno svima. Autor djela je naveden uz tekst; osoba koja je pripremila objavu i potpisnik uredničke bilješke mogu biti različite osobe.',
    '',
    '## O časopisu i autorima',
    '',
    link('Početna', '/', 'Izbor redakcije i novi tekstovi.'),
    link('O časopisu', '/o-casopisu', 'Časopis i redakcija.'),
    link('Autori', '/autori', 'Biografije i objavljeni radovi; profili su na /autor/{slug}.'),
    '',
    '## Rubrike',
    '',
    ...rubrics
      .filter(([slug]) => slug !== 'price')
      .map(([slug, title]) => link(title, `/rubrika/${slug}`, `Arhiva rubrike ${title}.`)),
    link('Umjetnost', '/rubrika/umjetnost', 'Slikarstvo, muzika i film.'),
    '',
    '## Izvori i pravila',
    '',
    link(
      'Mapa sajta',
      '/sitemap.xml',
      'Aktuelni kanonski URL-ovi javnih stranica i objavljenih tekstova.',
    ),
    link('Pravila i privatnost', '/pravila', 'Pravila razgovora, slanja radova i privatnosti.'),
    '',
    'Objavljeni tekstovi su na /tekst/{slug}. Pri navođenju izvora navedite naslov, autora djela i kanonski URL teksta. Uredničke bilješke i komentari su odvojeni od izvornog djela. Privatni nacrti, nalozi i neobjavljeni prilozi nijesu javni izvori.',
    '',
  ].join('\n');
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
