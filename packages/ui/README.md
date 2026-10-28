# FENAKI design system

Every screen of FENAKI (web now; apps and TV later) is built from two packages:

- `packages/tokens`: the design tokens. `tokens.json` is the single source, in the W3C Design Tokens (DTCG) format; `pnpm --filter @fenaki/tokens build` turns it into the Tailwind v4 theme (`dist/theme.css`), the light mode for email and print (`dist/light.css`) and plain palettes (`dist/palettes.json`). The package also exports resolved values for code that needs them (`palettes`, `variables`, `typography`).
- `packages/ui`: the React components, built only from tokens and accessible primitives (Radix), organised by atomic level. Astro renders them as static HTML and hydrates only interactive islands. Storybook (`pnpm storybook`) is the living catalogue, and every story is a visual regression test (`pnpm test:visual`).

The brand book (look, voice, imagery, logo) is `design/system/README.md`. The product is dark only; the light mode exists only for the newsletter, the sponsor dossier and print.

## Tokens

### Three tiers

| Tier          | What it holds                                                                                                                                                                                                | Who uses it                                 | CSS variable                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| **primitive** | Raw values with neutral names: colour palettes by hue and step (`gray.950`, `pink.500`, `maroon.800`), font families, weights and sizes, the spacing and radius scales, durations, easings, opacities, blur. | Only semantic and component tokens.         | `--base-*`, outside the Tailwind theme: no utilities. |
| **semantic**  | Roles in English: surfaces, text, borders, the accent, sponsored and status colours, type styles, spacing, radius, shadow, containers, motion.                                                               | Components and pages.                       | The Tailwind namespace of the role (below).           |
| **component** | One component's decisions: control heights, chip height, poster perforation, preview timing, button labels.                                                                                                  | That component (and code that measures it). | `--{component}-{property}`, or a named utility.       |

A semantic or component token is an alias (`"$value": "{primitive.color.gray.950}"`) or, for a dimension that is on no scale (a 168px column, a 280px card), a literal. Primitive colour steps are about (100 − L\*) × 10, so they compare across hues.

### Modes

`$value` is the dark mode («Sala»), the product. The light mode («Vestíbulo») is in `$extensions["tv.fenaki"].modes.light` and maps the same semantic names to other primitives. `theme.css` carries only dark; `light.css`, `palettes.light` and `variables.light` carry the light values for email and print.

### The format

DTCG structure: `$value`, `$type` (inherited from groups), `$description`, `{dotted.path}` aliases and `$root` for a group's base token (`semantic.color.accent.$root` is the accent; `semantic.color.accent.hover` its hover). Values are CSS strings rather than DTCG's object form for dimensions, because the system needs `ch` measures and unitless line heights. FENAKI's own keys live under `$extensions["tv.fenaki"]`: `modes`, `utility`, and for type styles `family` and `sample`.

### Naming rules

- English, lower case, kebab-case; named by role, never by look or metaphor (`background.raised`, not «sala»). The brand's metaphors (the room, the tungsten marquee, the curtain) stay in the brand book as prose.
- Groups go from general to specific: `color.text.on-accent`, `component.short-card.progress-height`.
- Scales use t-shirt sizes where the steps are relative (`radius.xs` … `lg`, `shadow.sm` … `lg`, `size.icon.xs` … `xl`) and Tailwind's step numbers for spacing (`spacing.4` = 16px).
- `subtle` is the tinted ground of a colour, `on-*` is what sits on a fill, `inverse` is the opposite of the default (a fill in the text colour, text over a light still).
- A component token is named after its component and property: `control.height-md`, `tooltip.arrow-size`.

### From token to utility class

The CSS variable of a semantic token is its Tailwind theme variable, chosen so utilities read by role without repeating it:

| Token                                                                                                 | CSS variable                                                                                                    | Classes                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `color.background.*`                                                                                  | `--background-color-*`                                                                                          | `bg-canvas`, `bg-raised`, `from-canvas`                                                                                             |
| `color.text.*`                                                                                        | `--text-color-*`                                                                                                | `text-primary`, `text-secondary`, `text-on-accent`                                                                                  |
| `color.border.*`                                                                                      | `--border-color-*`                                                                                              | `border-subtle`, `border-strong`                                                                                                    |
| `color.accent`, `sponsored`, `info`, `danger`, `glow`, `scrim`                                        | `--color-*`                                                                                                     | every colour utility: `bg-accent`, `fill-accent`, `border-danger`, `bg-info-subtle`                                                 |
| `typography.*`                                                                                        | `--text-*` (+ `--line-height`, `--font-weight`, `--letter-spacing`)                                             | `text-body-l`, `text-label`                                                                                                         |
| `spacing.*`, `radius.*`, `shadow.*`, `container.*`, `opacity.*`, `blur.*`, `ease.*`, `aspect-ratio.*` | `--spacing-*`, `--radius-*`, `--shadow-*`, `--container-*`, `--opacity-*`, `--blur-*`, `--ease-*`, `--aspect-*` | `p-4`, `rounded-md`, `shadow-lg`, `max-w-narrow`, `opacity-secondary`, `backdrop-blur-translucent`, `ease-standard`, `aspect-still` |
| `size.*`, `duration.*`                                                                                | `--size-*`, `--duration-*`                                                                                      | arbitrary values: `size-(--size-icon-md)`, `duration-(--duration-fast)`                                                             |

Surfaces, text and borders are scoped to their utility, so `bg-primary` or `text-canvas` do not exist. Brand and status colours are shared: one token, every utility. A component token is a plain variable used as an arbitrary value (`h-(--control-height-md)`, `w-(--short-card-width)`), unless `$extensions["tv.fenaki"].utility` exposes it under a theme name, as `--radius-control` (`rounded-control`), `--text-button-md` (`text-button-md`) or `--container-dialog` (`max-w-dialog`). When a role is needed in a utility that does not carry it, use the variable: `text-(color:--background-color-muted)` for the rank number, `fill-(--background-color-canvas)/70` for a progress track.

Tailwind's default theme is cleared (`--*: initial`): only FENAKI tokens make utilities, and primitives make none. Never write a colour, size or font literal in a component.

### In code

```ts
import { palettes, typography, variables } from '@fenaki/tokens'

palettes.dark['background-canvas'] // '#141414' (semantic colours and shadows)
variables.light['--text-color-primary'] // '#17130f' (every CSS variable, resolved)
typography['button-lg'] // { fontSize: '17px', lineHeight: '24px', fontWeight: 700, … }
```

### Adding or changing a token

1. Edit `packages/tokens/tokens.json`. A new raw value goes in `primitive`; give components a semantic token (or a component token, if only one component needs it) that points at it. Add the light value under `$extensions["tv.fenaki"].modes.light` for colours and shadows. Describe what it is for in `$description`.
2. `pnpm --filter @fenaki/tokens build` and `pnpm --filter @fenaki/tokens test` (the build fails on unknown or circular aliases and on two tokens that would emit the same variable).
3. Use it through its utility class or variable. The Storybook foundations pages pick it up on their own.
4. Renaming a token: update every use, add the old name to `packages/tokens/scripts/migration.ts` so `test/old-names.test.ts` keeps it out, and regenerate the visual baselines.

## Components

### Atomic levels

Components follow Brad Frost's atomic design. Each file sits in the folder of its level, with its story beside it (`src/atoms/Button.tsx`, `src/atoms/Button.stories.tsx`), and `src/index.ts` exports everything under the same name, so imports never mention the folder: `import { Button } from '@fenaki/ui'`.

- `src/foundations/`: what every level draws on: icons, the brand marks, the `cx` class helper, the still text helper and the tokens (re-exported for Storybook).
- `src/atoms/`: the smallest parts that still work on their own; they contain no other component (icons aside).
- `src/molecules/`: a few atoms working together as one unit with one job.
- `src/organisms/`: whole, distinct sections of a page, made of molecules and atoms.
- No templates: page layouts live in the apps (`apps/web/src/layouts`). `src/stories/` holds the shared fixtures and the page compositions shown under Pages.

### Classification

| Component            | Level      | Why                                                                                             |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `Icon`               | foundation | The icon set: drawn by every level, never on its own.                                           |
| `Wordmark`           | foundation | The logotype, a brand asset.                                                                    |
| `Monogram`           | foundation | The «F» mark, a brand asset.                                                                    |
| `TmdbLogo`           | foundation | TMDB's attribution mark, an asset used where its data appears.                                  |
| `Badge`              | atom       | One short label in a tone; nothing smaller would mean anything.                                 |
| `Button`             | atom       | One control: a label and an optional icon.                                                      |
| `IconButton`         | atom       | One control with only an icon.                                                                  |
| `Duration`           | atom       | One formatted value (`Intl`) in the timecode style.                                             |
| `Poster`             | atom       | The typographic cover: a single image-like block of title, director and year.                   |
| `RankNumber`         | atom       | One decorative figure.                                                                          |
| `Prose`              | atom       | A typographic wrapper for rich text; it composes no other component.                            |
| `Tooltip`            | atom       | One label bubble attached to its trigger.                                                       |
| `SearchField`        | atom       | One input; its label is for screen readers and its icon is decoration.                          |
| `Checkbox`           | molecule   | A native checkbox and its visible label, as one control.                                        |
| `TextField`          | molecule   | Label, input and hint or error working as a unit.                                               |
| `LabelledIconButton` | molecule   | An `IconButton` and the `Tooltip` that names it, as one control.                                |
| `Notice`             | molecule   | A toned title and its message.                                                                  |
| `LicenseNote`        | molecule   | The license route, its credit text and link.                                                    |
| `SponsorCredit`      | molecule   | The «Presentado por» label with the sponsor's name or logo, linked.                             |
| `PageHeader`         | molecule   | Eyebrow, heading and description: the head of a page.                                           |
| `Pagination`         | molecule   | Previous and next links with the page status.                                                   |
| `FilterChips`        | molecule   | A group of toggle chips with one job: filter a list.                                            |
| `FacetGroup`         | molecule   | A heading and its facet chips with counts.                                                      |
| `RatingButtons`      | molecule   | Icon buttons and tooltips folded into one rating control.                                       |
| `OfferCard`          | molecule   | Audience, offer, prices and a `Button`: one card.                                               |
| `ShortCard`          | molecule   | Still or `Poster`, `Badge`s, `Duration`, title and progress: the catalogue's card, one unit.    |
| `Dialog`             | organism   | The modal panel: a self-contained section over the page, holding whole forms or messages.       |
| `PlayerGate`         | organism   | The player area: still, consent message and actions, a distinct section of a short's page.      |
| `ShortPreview`       | organism   | The floating preview: poster or still, metadata, `RatingButtons` and actions.                   |
| `Rail`               | organism   | A heading, its action and a scrolling row of cards with arrows.                                 |
| `RankedRail`         | organism   | The Top 10 rail; its `RankedItem` (a `RankNumber` beside a `ShortCard`) lives in the same file. |
| `ShortGrid`          | organism   | A responsive grid of `ShortCard`s.                                                              |
| `ShortHero`          | organism   | The featured short: backdrop or poster, title, metadata and actions.                            |
| `CollectionHero`     | organism   | A collection's head: art, title, description, actions and, when sponsored, the `SponsorCredit`. |
| `ShowcaseHero`       | organism   | A showcase's head: logo, title, links and the `SponsorCredit`.                                  |
| `SiteHeader`         | organism   | The site's navigation, search and account menu.                                                 |
| `SiteFooter`         | organism   | The site's footer: mark and links.                                                              |

`RankedItem` is exported from `RankedRail.tsx` and counts as a molecule; it stays with the rail it only appears in.

### Adding a component

1. Pick the level by what it contains: no other component (atom), a few atoms with one job (molecule), a whole section (organism). Create `src/<level>/<Name>.tsx` with props for every user-facing string (they come from `packages/i18n`), styled only with token utilities.
2. Add `src/<level>/<Name>.stories.tsx` titled `<Level>/<Name>` (`Atoms/Badge`), with a story per meaningful state.
3. Export it, and its prop types, from `src/index.ts` in its level's block.
4. `pnpm test:visual:update` on arm64 to add its baselines, and commit them with the component.

Never build a one-off button or card inside a page: add or change the component here.

## Editorial typography

Every piece that announces something (a page head, the landing page, an email, a social post) stacks the same four roles. Web, emails and social pieces share them; the brand book (`design/system/README.md`) has the same rules for people who design outside the code.

| Role                 | Type                                                                                                        | In the system                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Kicker** (eyebrow) | Text family, weight 500, uppercase, letter-spacing 0.06em, accent text colour.                              | `font-text text-label uppercase text-accent`                                 |
| **Headline**         | Display family (Archivo condensed, `wdth` 75), weight 800, uppercase, line height 0.92. No final full stop. | `font-display text-display-xl uppercase` (`text-display-l` on small screens) |
| **Lead**             | `body-l`, weight 400, in the primary text colour (white): never muted under a headline.                     | `text-body-l text-primary`                                                   |
| **Secondary**        | Contact lines, counters, footnotes: `small`, in the muted text colour.                                      | `text-small text-secondary`                                                  |

**One colour.** Headlines are all in the primary text colour (white). The accent colour is for the kicker, links and actions, never for part of a headline: a two-tone headline breaks the line and the rhythm (tried and dropped on 27 Oct 2026).

Today the site's eyebrows use `font-mono` (the same Archivo with tabular figures, so only digits differ); new pieces follow the table.

### Social pieces

Carousels (1080×1350) and cards (1200×675) use these same roles: same families, weights, case, tracking and colours, on the canvas colour; headlines are all white (the accent colour only for the kicker and the domain). A phone shows a slide at about a third of its size, so the sizes are larger than a straight scale of the web's: on a carousel slide, headline 130px, lead 44px, kicker 40px, secondary 32px, domain 88px; a card uses about 0.62 of those. The renderer and the rules for posts are Claude Code skills: `.claude/skills/fenaki-social-design` (images) and `.claude/skills/fenaki-social-writing` (texts).

## Storybook

The sidebar follows the levels: **Foundations** (colour in both modes with semantic and primitive swatches, typography, spacing, radius, shadow, motion, component tokens, iconography and the brand marks), **Atoms**, **Molecules**, **Organisms** and **Pages**. The foundations pages are generated from `@fenaki/tokens`, so they change with the tokens. Every story is screenshotted by `pnpm test:visual`; baselines are keyed by story id (`atoms-button--primary.png`), so renaming a story or its title means regenerating them.

## Migration from the first token names (October 2026)

<!-- old-names:start -->

The first tokens were named after the brand's metaphors (`sala`, `tungsteno`, `telón`, `plata`) and mixed tiers. They were renamed with no visual change: every old variable resolves to the same value as its successor, and the screenshots of every story, site page, OG image and email matched before and after. `packages/tokens/scripts/migration.ts` is the full record and `scripts/codemod.ts` applied it. Two props changed with them: `Button`'s `surface` (`'sala' | 'telon'` is now `'default' | 'sponsored'`) and `IconButton`'s `veil` variant (now `translucent`). The poster tones (`sala`, `tungsteno`, `plata`, `telon`) keep their names because they are stored with each short; they are content values, not tokens.

#### Colour

| Old               | New token                               | CSS variable                     | Classes                                                                                                                                                                                                                |
| ----------------- | --------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sala-0`          | `semantic.color.background.canvas`      | `--background-color-canvas`      | `bg-sala-0` → `bg-canvas`<br>`from-sala-0` → `from-canvas`<br>`fill-sala-0` → `fill-(--background-color-canvas)`<br>`text-sala-0` → `text-on-inverse`<br>_As text on an inverse fill: semantic.color.text.on-inverse._ |
| `sala-1`          | `semantic.color.background.raised`      | `--background-color-raised`      | `bg-sala-1/(--opacity-scrim)` → `bg-scrim/(--opacity-scrim)`<br>`bg-sala-1` → `bg-raised`<br>_Behind a dialog: semantic.color.scrim._                                                                                  |
| `sala-2`          | `semantic.color.background.muted`       | `--background-color-muted`       | `bg-sala-2` → `bg-muted`<br>`text-sala-2` → `text-(color:--background-color-muted)`                                                                                                                                    |
| `line`            | `semantic.color.border.subtle`          | `--border-color-subtle`          | `border-line` → `border-subtle`                                                                                                                                                                                        |
| `line-strong`     | `semantic.color.border.strong`          | `--border-color-strong`          | `border-line-strong` → `border-strong`<br>`text-line-strong` → `text-(color:--border-color-strong)`                                                                                                                    |
| `veil`            | `semantic.color.background.translucent` | `--background-color-translucent` | `bg-veil` → `bg-translucent`                                                                                                                                                                                           |
| `glow`            | `semantic.color.glow`                   | `--color-glow`                   | —                                                                                                                                                                                                                      |
| `ink`             | `semantic.color.text.primary`           | `--text-color-primary`           | `text-ink` → `text-primary`<br>`bg-ink` → `bg-inverse`<br>`border-ink` → `border-inverse`<br>_As a fill: semantic.color.background.inverse; as an edge: semantic.color.border.inverse._                                |
| `ink-inverse`     | `semantic.color.text.inverse`           | `--text-color-inverse`           | `text-ink-inverse` → `text-inverse`                                                                                                                                                                                    |
| `ink-muted`       | `semantic.color.text.secondary`         | `--text-color-secondary`         | `text-ink-muted` → `text-secondary`                                                                                                                                                                                    |
| `tungsteno`       | `semantic.color.accent`                 | `--color-accent`                 | `bg-tungsteno` → `bg-accent`<br>`fill-tungsteno` → `fill-accent`<br>`accent-tungsteno` → `accent-accent`<br>`text-tungsteno` → `text-accent`                                                                           |
| `tungsteno-hover` | `semantic.color.accent.hover`           | `--color-accent-hover`           | `bg-tungsteno-hover` → `bg-accent-hover`                                                                                                                                                                               |
| `tungsteno-text`  | `semantic.color.text.accent`            | `--text-color-accent`            | `text-tungsteno-text` → `text-accent`                                                                                                                                                                                  |
| `on-tungsteno`    | `semantic.color.text.on-accent`         | `--text-color-on-accent`         | `text-on-tungsteno` → `text-on-accent`                                                                                                                                                                                 |
| `tungsteno-soft`  | `semantic.color.accent.subtle`          | `--color-accent-subtle`          | `bg-tungsteno-soft` → `bg-accent-subtle`                                                                                                                                                                               |
| `telon`           | `semantic.color.sponsored`              | `--color-sponsored`              | `bg-telon` → `bg-sponsored`                                                                                                                                                                                            |
| `on-telon`        | `semantic.color.text.on-sponsored`      | `--text-color-on-sponsored`      | `text-on-telon` → `text-on-sponsored`<br>`border-on-telon` → `border-on-sponsored`<br>_As an edge: semantic.color.border.on-sponsored._                                                                                |
| `plata`           | `semantic.color.info`                   | `--color-info`                   | `text-plata` → `text-info`                                                                                                                                                                                             |
| `plata-soft`      | `semantic.color.info.subtle`            | `--color-info-subtle`            | `bg-plata-soft` → `bg-info-subtle`                                                                                                                                                                                     |
| `danger`          | `semantic.color.danger`                 | `--color-danger`                 | —                                                                                                                                                                                                                      |

#### Type styles

| Old          | New token                      | CSS variable           | Classes                              |
| ------------ | ------------------------------ | ---------------------- | ------------------------------------ |
| `poster`     | `component.poster.title`       | `--text-poster-title`  | `text-poster` → `text-poster-title`  |
| `credit`     | `component.poster.credit`      | `--text-poster-credit` | `text-credit` → `text-poster-credit` |
| `button`     | `component.button.label-md`    | `--text-button-md`     | `text-button` → `text-button-md`     |
| `button-sm`  | `component.button.label-sm`    | `--text-button-sm`     | —                                    |
| `button-lg`  | `component.button.label-lg`    | `--text-button-lg`     | —                                    |
| `card-title` | `component.short-card.title`   | `--text-card-title`    | —                                    |
| `nav`        | `component.site-header.link`   | `--text-nav`           | —                                    |
| `rank`       | `component.rank-number.single` | `--text-rank`          | —                                    |
| `rank-two`   | `component.rank-number.double` | `--text-rank-double`   | `text-rank-two` → `text-rank-double` |

#### Radius

| Old              | New token                  | CSS variable       | Classes                        |
| ---------------- | -------------------------- | ------------------ | ------------------------------ |
| `radius-hero`    | `semantic.radius.lg`       | `--radius-lg`      | `rounded-hero` → `rounded-lg`  |
| `radius-panel`   | `semantic.radius.md`       | `--radius-md`      | `rounded-panel` → `rounded-md` |
| `radius-control` | `component.control.radius` | `--radius-control` | —                              |

#### Shadow

| Old            | New token            | CSS variable  | Classes                      |
| -------------- | -------------------- | ------------- | ---------------------------- |
| `shadow-card`  | `semantic.shadow.sm` | `--shadow-sm` | `shadow-card` → `shadow-sm`  |
| `shadow-hero`  | `semantic.shadow.md` | `--shadow-md` | `shadow-hero` → `shadow-md`  |
| `shadow-hover` | `semantic.shadow.lg` | `--shadow-lg` | `shadow-hover` → `shadow-lg` |

#### Size

| Old                | New token                              | CSS variable                   | Classes |
| ------------------ | -------------------------------------- | ------------------------------ | ------- |
| `control-sm`       | `component.control.height-sm`          | `--control-height-sm`          | —       |
| `control-md`       | `component.control.height-md`          | `--control-height-md`          | —       |
| `control-lg`       | `component.control.height-lg`          | `--control-height-lg`          | —       |
| `control-search`   | `component.search-field.height`        | `--search-field-height`        | —       |
| `chip`             | `component.chip.height`                | `--chip-height`                | —       |
| `badge`            | `component.badge.height`               | `--badge-height`               | —       |
| `card`             | `component.short-card.width`           | `--short-card-width`           | —       |
| `perforation`      | `component.poster.perforation-width`   | `--poster-perforation-width`   | —       |
| `perforation-hole` | `component.poster.perforation-hole`    | `--poster-perforation-hole`    | —       |
| `tooltip-arrow`    | `component.tooltip.arrow-size`         | `--tooltip-arrow-size`         | —       |
| `lift`             | `component.poster.lift`                | `--poster-lift`                | —       |
| `press`            | `component.control.press-offset`       | `--control-press-offset`       | —       |
| `progress`         | `component.short-card.progress-height` | `--short-card-progress-height` | —       |
| `hero`             | `component.short-hero.min-height`      | `--short-hero-min-height`      | —       |
| `page-glow`        | `component.page-glow.height`           | `--page-glow-height`           | —       |
| `header`           | `component.site-header.height`         | `--site-header-height`         | —       |
| `rank-overlap`     | `component.ranked-rail.overlap`        | `--ranked-rail-overlap`        | —       |

#### Container

| Old           | New token                           | CSS variable              | Classes                       |
| ------------- | ----------------------------------- | ------------------------- | ----------------------------- |
| `note`        | `semantic.container.narrow`         | `--container-narrow`      | `max-w-note` → `max-w-narrow` |
| `email`       | `component.email.max-width`         | `--email-max-width`       | —                             |
| `search`      | `component.search-field.max-width`  | `--container-search`      | —                             |
| `dialog`      | `component.dialog.max-width`        | `--container-dialog`      | —                             |
| `landing`     | `component.landing.max-width`       | `--container-landing`     | —                             |
| `hero-poster` | `component.short-hero.poster-width` | `--container-hero-poster` | —                             |
| `player-text` | `component.player-gate.text-width`  | `--container-player-text` | —                             |

#### Motion

| Old                   | New token                             | CSS variable                  | Classes |
| --------------------- | ------------------------------------- | ----------------------------- | ------- |
| `duration-press`      | `semantic.duration.fast`              | `--duration-fast`             | —       |
| `duration-lift`       | `component.poster.lift-duration`      | `--poster-lift-duration`      | —       |
| `delay-preview`       | `component.short-preview.delay-open`  | `--short-preview-delay-open`  | —       |
| `delay-preview-close` | `component.short-preview.delay-close` | `--short-preview-delay-close` | —       |
| `duration-preview`    | `component.short-preview.duration`    | `--short-preview-duration`    | —       |
| `layer-preview`       | `component.short-preview.layer`       | `--short-preview-layer`       | —       |
| `duration-header`     | `component.site-header.duration`      | `--site-header-duration`      | —       |
| `duration-pill`       | `component.rating-pill.duration`      | `--rating-pill-duration`      | —       |
| `scale-pill-folded`   | `component.rating-pill.scale-folded`  | `--rating-pill-scale-folded`  | —       |

#### Opacity and blur

| Old                   | New token                              | CSS variable                  | Classes                                            |
| --------------------- | -------------------------------------- | ----------------------------- | -------------------------------------------------- |
| `opacity-perforation` | `component.poster.perforation-opacity` | `--opacity-perforation`       | —                                                  |
| `opacity-pill`        | `component.rating-pill.opacity`        | `--rating-pill-opacity`       | —                                                  |
| `opacity-veil`        | `semantic.opacity.translucent`         | `--opacity-translucent`       | —                                                  |
| `opacity-veil-hover`  | `semantic.opacity.translucent-hover`   | `--opacity-translucent-hover` | —                                                  |
| `blur-veil`           | `semantic.blur.translucent`            | `--blur-translucent`          | `backdrop-blur-veil` → `backdrop-blur-translucent` |

<!-- old-names:end -->
