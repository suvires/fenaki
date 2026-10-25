Fenaki is a curated catalog of free, legal short films with the browsing experience of a streaming service. The look is a darkened screening room: warm black walls, one projector-light accent, poster capitals for titles. Everything a viewer sees is built from these tokens and components; pages only compose them.

## Content fundamentals

- Write in neutral Spanish that works in Spain and Latin America. Address the viewer as «tú», never «vosotros». Avoid Spain-only words («móvil», «ordenador», «molar»).
- Say «corto» or «cortometraje», never «vídeo» or «clip». The motto is «El mejor cine, en cortos».
- Short, plain sentences. No exclamation marks, no superlatives, no emoji.
- Buttons say what happens: «Ver ahora», «Añadir a mi lista», «Ver todo». Never «Haz clic aquí».
- Credit people by name: «Dirigido por Juanjo Giménez». Directors' names are never truncated on a short's page.
- Durations, dates and numbers always go through `Intl` (`Duration` does this): «15 min», never a hand-written string.
- Components never contain user-facing text. Every label comes in through props from the locale files (`packages/i18n`); the previews here pass Spanish strings as examples.

## Visual foundations

**Color.** The web and the apps are dark only (`dark`, «Sala»), with no theme switcher, like every streaming service: posters and video read best on dark. The light palette (`light`, «Vestíbulo») is not a product theme: use it only for the newsletter, the sponsor dossier and printed or PDF documents. Tokens are named by role, so a light product theme could be switched on later without touching components.

- Pages sit on `sala-0`. Raised areas use `sala-1`; posters without art, secondary buttons and hover fills use `sala-2`.
- `tungsteno` is neon pink, like a cinema marquee (#ff1f8e on the dark theme, #c2005f on the light palette; the token keeps its first name), and the only action color: primary buttons, the active state, the focus ring. One primary button per view, besides «Crear cuenta» in the site header. Never use it as decoration or as a large background other than the `tungsteno` poster tone.
- `telon` (the curtain) is reserved for sponsored collections: their hero and posters. If a screen is wine, someone paid for it, and the `SponsorCredit` says who.
- `plata` (the silver screen) marks legal and informational facts: the license route, subtitle badges.
- Text is `ink` or `ink-muted` on the `sala` surfaces, `on-tungsteno` on tungsteno, `on-telon` on telon. Never white or black literals.
- Hairlines are `line`; anything a person operates (inputs, chips, secondary buttons) has a `line-strong` border.
- `danger` appears only with a word next to it.

**Type.** Three families, each with one job.

- `display` (Big Shoulders): condensed poster capitals for titles: `display-xl` for the collection hero, `display-l` for a short's page and the player, `title` for rail headings, `poster` on typographic posters. Always uppercase.
- `text` (Atkinson Hyperlegible Next): everything people read. `body-l` for synopses, `body` by default, `card-title` under posters, `meta` for directors and secondary data.
- `mono` (Atkinson Hyperlegible Mono): the timecode voice. `timecode` for durations, `label` (uppercase, tracked) for badges, eyebrows and the sponsor label.

**Spacing and layout.** 4px base. Cards in a rail sit `space-4` apart; rails are `space-12` apart; the page gutter is at least `space-4`. Rails scroll horizontally with snap; the page itself never scrolls sideways.

**Shape.** Screens are rectangles: `radius-sm` (4px) is the largest corner on any poster, still or card. `radius-xs` for badges. `radius-full` only for filter chips.

**Imagery.** Posters are `ratio-poster` (2:3), stills and the player `ratio-still` (16:9). Until a short has art cleared for use, it shows a typographic `Poster`: title in poster capitals, director and year, with a film-perforation strip on the left edge. Never use a frame grabbed from a video without rights.

**Elevation and motion.** Posters rest on `shadow-card` and lift 4px onto `shadow-hover` on hover or focus, in 150 ms. Nothing else moves. With `prefers-reduced-motion`, nothing moves at all.

**Focus.** Every interactive element shows `focus-ring` (a `sala-0` gap, then a 2px `tungsteno` ring) on keyboard and TV-remote focus. Focus must be visible from the sofa: never remove it.

## Legal rules that shape the UI

- Third-party players load only after consent. Show `PlayerGate` first; it names the provider and what it does with cookies.
- Sponsorship lives on the collection page, the home hero and the newsletter, never on or near the player. A short's page shows no sponsor credit inside the player area.
- Every short's page shows its `LicenseNote`: how it reaches Fenaki (official embed, open license, direct license) and the credit the license asks for.

## Logo

The logotype is «FENAKI» in Big Shoulders 800, outlined: it never depends on the font. It lives in the design system as `Wordmark` (`packages/ui`, drawn in `currentColor`, sized by height with a spacing class such as `h-6`) and as the file `packages/ui/src/assets/wordmark.svg` (`@fenaki/ui/wordmark.svg`) for emails, OG images and print. Use it in `ink` on the `sala` surfaces, or in `tungsteno` as an accent; never redraw it as text.

## Iconography

Inline SVG on a 24px grid, 1.75 stroke, round caps and joins, drawn in `currentColor`. The set is small on purpose: play (filled), plus, search, arrow. No emoji, no icon fonts.

## Sample content

Previews use real Spanish shorts so the layouts read true. Durations are approximate and their availability on official channels is not verified; the sponsor «Festival de Cine Breve» is fictional.
