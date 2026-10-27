FENAKI gathers the short films published openly by their makers, festivals and schools in one catalog, with the browsing experience of a streaming service. The look is a darkened screening room: warm black walls, one projector-light accent, poster capitals for titles. Everything a viewer sees is built from these tokens and components; pages only compose them.

The components and tokens themselves live in `packages/tokens` and `packages/ui` (`packages/ui/README.md`), the source of truth. The prototype in this folder (`tokens.json`, `tokens.css`, `components/`, `index.html`) is the validated direction they were ported from, kept as it was: it still uses the first token names.

## Content fundamentals

- Write in neutral Spanish that works in Spain and Latin America. Address the viewer as «tú», never «vosotros». Avoid Spain-only words («móvil», «ordenador», «molar»).
- Say «corto» or «cortometraje», never «vídeo» or «clip». The motto is «El mejor cine, en cortos».
- Short, plain sentences. No exclamation marks, no superlatives, no emoji.
- Buttons say what happens: «Ver ahora», «Añadir a mi lista», «Ver todo». Never «Haz clic aquí».
- Credit people by name: «Dirigido por Juanjo Giménez». Directors' names are never truncated on a short's page.
- Durations, dates and numbers always go through `Intl` (`Duration` does this): «15 min», never a hand-written string.
- Components never contain user-facing text. Every label comes in through props from the locale files (`packages/i18n`); the previews here pass Spanish strings as examples.

## Visual foundations

Token names below are the semantic tokens of `packages/tokens` (`packages/ui/README.md` explains the tiers and the utilities). The metaphors stay here, as a description of the look: they are not token names.

**Color.** The web and the apps are dark only (the dark mode, «Sala»), with no theme switcher, like every streaming service: posters and video read best on dark. The light mode («Vestíbulo») is not a product theme: use it only for the newsletter, the sponsor dossier and printed or PDF documents. Tokens are named by role, so a light product theme could be switched on later without touching components.

- Pages sit on `background.canvas`, the darkened room. Raised areas use `background.raised`; posters without art, secondary buttons and hover fills use `background.muted`.
- `accent` is neon pink, like the tungsten lights of a cinema marquee (#ff1f8e in the dark mode, #c2005f in the light one), and the only action color: primary buttons, the active state, the focus ring. One primary button per view, besides «Crear cuenta» in the site header. Never use it as decoration or as a large background other than the accent poster tone.
- `sponsored` is the curtain (el telón), wine, reserved for sponsored collections: their hero and posters. If a screen is wine, someone paid for it, and the `SponsorCredit` says who.
- `info` is the silver screen: it marks legal and informational facts, the license route, subtitle badges.
- Text is `text.primary` or `text.secondary` on the surfaces, `text.on-accent` on the accent, `text.on-sponsored` on the sponsored color. Never white or black literals.
- Hairlines are `border.subtle`; anything a person operates (inputs, chips, secondary buttons) has a `border.strong` edge.
- `danger` appears only with a word next to it.

**Type.** One family, Archivo, in three voices.

- `display` (Archivo at 75 % width): condensed poster capitals for titles: `display-xl` for the collection hero, `display-l` for a short's page and the player, `title` for rail headings, the poster's own title style on typographic posters. Always uppercase.
- `text` (Archivo at its normal width): everything people read. `body-l` for synopses, `body` by default, the card title under posters, `meta` for directors and secondary data.
- `mono` (Archivo with tabular figures): the timecode voice. `timecode` for durations, `label` (uppercase, tracked) for badges, eyebrows and the sponsor label.

**Editorial roles.** Every piece that announces something (the web, emails, social posts) stacks four roles:

- **Kicker** (eyebrow): Archivo in its text voice, weight 500, uppercase, tracked 0.06em, in the accent colour.
- **Headline**: display capitals (Archivo condensed, 800), line height 0.92, no final full stop. All white: the accent colour goes to the kicker, links and actions, never to part of a headline.
- **Lead** under a headline: `body-l`, regular, white, as on the landing page.
- **Secondary** (contact lines, counters, footnotes): `small`, in `text.secondary`.

**Social pieces.** Carousels (1080×1350) and cards (1200×675) use the same roles, on the page colour, with all-white headlines (the accent colour only for the kicker and the domain). On a slide: headline 130px, lead 44px, kicker 40px, secondary 32px (a card uses about 0.62 of those); see `packages/ui/README.md` and the `fenaki-social-design` skill.

**Spacing and layout.** 4px base. Cards in a rail sit `spacing.4` apart; rails are `spacing.12` apart; the page gutter is at least `spacing.4`. Rails scroll horizontally with snap; the page itself never scrolls sideways.

**Shape.** Screens are rectangles: `radius.sm` (4px) is the largest corner on any poster, still or card; panels at card scale take `radius.md` and the heroes and the player `radius.lg`. `radius.xs` for badges. `radius.full` for filter chips, and the controls' own `control.radius`.

**Imagery.** Posters are `aspect-ratio.poster` (2:3), stills and the player `aspect-ratio.still` (16:9). A short's still comes only from the `stills` collection: the provider's thumbnail, cached on Fenaki's server and refreshed nightly, or one supplied by the author. Without a still it shows a typographic `Poster`: title in poster capitals, director and year, with a film-perforation strip on the left edge. Never use a frame grabbed from a video, and the OG image stays generated.

**Elevation and motion.** Cards and posters have no shadow at rest; a poster lifts 4px (`poster.lift`) onto `shadow.lg` on hover or focus, in 150 ms; floating panels use `shadow.lg`, small floating controls `shadow.sm`, the home hero `shadow.md`. Nothing else moves. With `prefers-reduced-motion`, nothing moves at all.

**Focus.** Every interactive element shows the focus ring (`shadow.focus-ring`: a dark gap, then a 2px accent ring) on keyboard and TV-remote focus. Focus must be visible from the sofa: never remove it.

## Legal rules that shape the UI

- Third-party players load only after consent. Show `PlayerGate` first; it names the provider and what it does with cookies.
- Sponsorship lives on the collection page, the home hero and the newsletter, never on or near the player. A short's page shows no sponsor credit inside the player area.
- Every short's page shows its `LicenseNote`: how it reaches Fenaki (official embed, open license, direct license) and the credit the license asks for.

## Logo

The logotype is «FENAKI» in Big Shoulders 800, outlined: it never depends on the font. It lives in the design system as `Wordmark` (`packages/ui`, drawn in `currentColor`, sized by height with a spacing class such as `h-6`) and as the file `packages/ui/src/assets/wordmark.svg` (`@fenaki/ui/wordmark.svg`) for emails, OG images and print. Use it in `text.primary` on the surfaces, or in `accent` as an accent; never redraw it as text.

## Iconography

Inline SVG on a 24px grid, 1.75 stroke, round caps and joins, drawn in `currentColor`. Every icon sits in the 20px live area (2px padding) and is sized by optical weight, not by bounding box: straight open strokes span 16px (plus, arrow), diagonals 13px (close), closed round shapes 15.5px (the magnifier), the thumbs (up, down, and the double pair) 16px wide and about 15px tall, the play triangle 17px with rounded corners and its weight centred (a triangle fills only half its box). The rail chevron is the one tall exception, sized to display capitals; the chevron-down is a plain 13px diagonal pair. The `Foundations/Iconography` «Grid» story shows them over the keylines. In buttons the icon is about 56 % of the control's height (18, 22 and 28px for sm, md and lg). The set is small on purpose: play (filled), plus, search, arrow, chevron, chevron-down, check, close, thumbs-up, thumbs-down, thumbs-up-double. No emoji, no icon fonts.

## Sample content

Previews use real Spanish shorts so the layouts read true. Durations are approximate and their availability on official channels is not verified; the sponsor «Festival de Cine Breve» is fictional.
