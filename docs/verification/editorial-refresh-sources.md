# September 2026 editorial refresh — provenance

The owner requested Nadežda Petrović's artwork, Savka's writing and biographies,
and confirmed on 6 September 2026 that Savka is the client and has given full
permission for republication. This is permission for the poems, not a declaration
that they are public domain. No portrait was supplied or licensed; none was copied.

## Writing

- [Slike, Nekazano, 7 May 2022](http://www.nekazano.me/slike-savka-gudovic-paradjina.php)
- [Nestajanja, Nekazano, 27 December 2021](http://www.nekazano.me/nestajanja-savka-gudovic-paradjina.php)

Canonical fixtures retain each source line, stanza separator, punctuation and
whole-poem italics. HTML's one heading/paragraph per verse line is represented as
one canonical line; empty blocks separate stanzas. The title and final signature
become structured metadata. Unrelated source illustrations were not reused.
`Nestajanja` retains its internal nonbreaking space followed by an ordinary space.

SHA-256 of UTF-8 body text:

- Slike: `412e577e27f6ab86b85224c88643948ed69cb122bc3681b383b148ca93e71df6`
- Nestajanja: `57d7bcb0c6d6fb9c5571b5e2b03966bd3f7aa71d763c47b25e2fb87275eb3a47`

The poems were found on Nekazano. They are not described as excerpts from
*Drhtaj pera*: their membership in that collection was not established.

## Biography

The original summary in `fixtures/savka-bio.json` is based on:

- [Vijesti, 8 September 2023](https://www.vijesti.me/vijesti/kultura/672740/promocija-knjige-savke-gudovic-paradjine-snazan-i-krhki-duh-pjesnikinje-koji-bogati-mastu): name, Podgorica, 1961, genres and the 2019/2023 books.
- [RTCG, 10 September 2023](https://rtcg.me/kultura/kulturna-galaksija/466025/promovisana-druga-knjiga-savke-gudovic-paradjina.html): writing since secondary school and publication history.
- [University of Montenegro library acquisitions, September–October 2025](https://ucg.ac.me/skladiste/blog_19317/objava_204282/fajlovi/CUB%20prinove%20-%20septembar%20i%20oktobar%202025.pdf): *Gospodari snova*, Ouroboros, 2024.

The owner identified Savka as editor 1 and requested the placeholder “Editor Dva”
for editor 2. The latter's page clearly says its biography is in preparation.

## Artwork

[Commons file record](https://commons.wikimedia.org/wiki/File:Nade%C5%BEda_Petrovi%C4%87_-_Breze.jpg)
marks *Breze* public domain, with PD-old-70 and US-expired categories. The local
JPEG is the 1422 × 1024 reproduction from that record. Its original-byte hash,
source, credit and download URL are in `fixtures/asset-manifest.json`. The imported
public derivative is re-encoded by the same bounded Sharp pipeline as other media.
No date is added to the caption because this Commons record gives no date.

## Explicit import

`scripts/import-savka.ts --confirm-publication` creates the two poems, one gallery,
and three credited profiles using fixed IDs. It requires the existing confirmed
editor 1 account. It never replaces existing posts, biographies or credentials.
Homepage selections are set only on first creation of each relevant post. It is
not run at startup or in CI/CD. Existing Zoran Đurović writing and Hammershøi
artwork remain intact.
