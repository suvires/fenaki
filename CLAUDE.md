# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Fenaki

Catalog of short films that their makers, festivals and schools publish openly (free and legal to watch), gathered in one place with a streaming-style UX (fenaki.tv). It goes for volume, not curation. Independent brand. Built in public as a 7-day challenge with Claude Code: «FENAKI en 7 días» («Día N de 7»), from 25 to 31 Oct 2026, launch on day 7. Revenue (first sponsors) is the next chapter, with no countdown.

- Product plan (Spanish): `private/plan/plan-de-desarrollo.md`
- Daily challenge log (Spanish): `private/diario/`

`private/` is gitignored here and versioned as its own private repository. It holds the plan, the daily log, expenses, the user's tasks, contacts and any business or personal data. Clones of the public repo do not have it.

## Working model

The challenge is an experiment: Claude does all the work (code, building the catalog, content, social media, sales prep) and the user supervises, validates and proposes. Act proactively and bring results for validation instead of handing tasks back. Only acts that legally or contractually require the user's identity stay with them: signing contracts, issuing invoices (they bill as a Spanish autónomo), payments and creating accounts. Log every expense in `private/diario/gastos.md`, and keep the user's to-do list in `private/plan/tus-tareas.md` up to date (add tasks as they come up, tell the user when each is due).

## Public repository

The repo is public on GitHub (free Actions minutes, build-in-public). Never commit secrets (use GitHub secrets and env vars, read by Kamal) or third-party personal data (festival and school contacts, sponsor details): those live in the database or in `private/`. Anything outside `private/` is public. Commit author email is suvires@gmail.com (never the user's work email); the repo lives under the GitHub account `suvires`.

## Status

Production runs at fenaki.tv (runbook in `docs/deploy.md`). Claude operates it; never ask the user for these:

- **GitHub:** the active `gh` account on this machine is the user's work account, so prefix every `gh` call on this repo with `GH_TOKEN=$(gh auth token -u suvires)`. Every push to `main` deploys. Other Kamal commands run as a manual dispatch of the Deploy workflow: `gh workflow run deploy.yml -f command=setup-services` (also `setup`, `rollback` with `-f version=<commit>`).
- **Server:** `ssh -i ~/.ssh/fenaki_deploy ubuntu@$(security find-generic-password -a fenaki -s prod-fenaki-host -w)`. The IP stays out of the repo (it is the origin behind Cloudflare).
- **Secrets:** macOS Keychain, account `fenaki` (`security find-generic-password -a fenaki -s <name> -w`; production values are `prod-*`).

Setup and every local command are in `README.md`. From the root:

- `docker compose up -d`: PostgreSQL, Meilisearch, listmonk, Mailpit (local SMTP) and Umami for development.
- `pnpm migrate`: applies the Payload migrations (the schema never changes by push, in development either).
- `pnpm import:catalog`: the real catalog from `CATALOG_IMPORT_PATH` (outside this repo), idempotent.
- `pnpm setup:services`: listmonk lists, SMTP and confirmation email, and the Umami website.
- `pnpm dev`: site (<http://localhost:4321/es/>), CMS admin (<http://localhost:3000/admin>) and the jobs worker. `SITE_MODE` in `apps/web/.env` switches between the pre-launch `landing` and the full `catalog`.
- `pnpm seed`: admin user, six sample shorts and one sponsored collection, all flagged as sample data (empty databases only; the e2e tests use it on their own database).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright smoke test), `pnpm build`.
- `pnpm storybook`: the component catalog.
- `pnpm test:visual` (`:update` to accept changes): screenshots of every story compared with committed baselines, in the Playwright Docker image; CI runs the same on every push and pull request. Any UI change needs updated baselines in the same commit, generated on arm64 only (colour threshold 0.03: absorbs rasterization noise, catches real changes). CI also runs lint, typecheck and test on every push and pull request.
- One test: `pnpm --filter <package> exec vitest run <file>` or `-t "<name>"`.

After changing a Payload collection, run `pnpm --filter @fenaki/cms migrate:create <name>` and `pnpm --filter @fenaki/cms generate:types`, and commit the migration and `payload-types.ts`; the site imports those types.

## Planned architecture

Every component was compared with its alternatives and validated on 25 oct 2026; the comparison, thresholds for revisiting and sources are in `private/plan/stack.md`.

When choosing technology, compare the real alternatives and pick what fits best long-term. Development time is not the constraint (agents write the code); avoid choices that force a migration later. Do weigh operating cost on the single VPS.

- **Web:** Astro with SSR, native i18n routing, interactive islands (validated).
- **Admin panel and API:** Payload CMS 3.x (Next.js app), upgrade to 4 when stable (validated). Astro reads the catalog through Payload's REST API, never its tables directly. Background jobs use Payload's built-in queue in a separate process.
- **Data:** PostgreSQL on the VPS (validated), daily off-site backups, pgvector later for recommendations. It is the source of truth; Meilisearch for search from day one, one index per locale, kept in sync by background jobs (validated).
- **Jobs:** ingestion (YouTube/Vimeo/TMDB metadata), nightly embed checker and search sync; Payload's built-in jobs queue on PostgreSQL, run as a separate process; no Redis (validated).
- **Email:** listmonk (self-hosted, on PostgreSQL) for newsletter and waitlist; Amazon SES in an EU region sends both newsletters and Payload account emails (validated). No self-hosted mail server.
- **Domains, DNS and mailbox:** domains and mailbox (Zimbra Starter, IMAP/SMTP) at OVHcloud; DNS, Cloudflare Tunnel (`cloudflared` alongside Kamal, no open ports), CDN and protection on Cloudflare's free plan, DNS managed as code via API (validated).
- **Analytics:** Umami (self-hosted, cookieless) for everyone, from the landing page on; custom events for embed plays and sponsor clicks. Cookie-based tools (GA4 with Consent Mode v2, ad pixels) only behind the CookieYes consent manager (Google-certified, IAB TCF on Pro), preferably sent server-side (validated).
- **Payments:** Stripe (validated): Payment Links for community support in phase 2, then Payload's Stripe plugin and Stripe Connect for rentals and author payouts. Every charge needs an invoice (the user bills as autónomo).
- **CI and errors:** GitHub Actions builds and deploys; Sentry (EU region, free tier) for error tracking (validated).
- **Deploy:** Kamal (validated) to a single OVHcloud VPS-1 (2 vCores, 4 GB) while traffic is low, upgraded in place to a VPS-2 (8 GB) when memory runs short (thresholds in `docs/deploy.md`), kamal-proxy for HTTPS, images on GitHub Container Registry, off-site backups and external uptime monitoring. Adding servers later is a config change. The MVP never serves video: playback is the official YouTube/Vimeo embed. Own video comes in phase 3 on Bunny Stream (preferred: EU, token-signed URLs, optional DRM for rentals).
- **Later:** mobile and TV apps in phase 5, consuming the same API; React Native + Expo vs fully native apps is undecided. Mobile during the challenge is a fast, installable web (manifest only, no offline mode).

### Design system

All UI goes through the design system (validated); `packages/ui/README.md` has the architecture, naming rules and classification. Three layers:

- `packages/tokens`: `tokens.json`, the single source, in the W3C DTCG format and three tiers: primitives (raw palettes and scales, `--base-*`, never used directly), semantic tokens named by role in English (what components use) and component tokens. The build emits the Tailwind v4 theme, so utilities read by role: `bg-canvas`, `bg-raised`, `text-secondary`, `border-subtle`, `bg-accent`, `text-on-sponsored`. Later also generated for the native apps.
- `packages/ui`: React components on accessible primitives (Radix), using tokens only, in atomic folders (`foundations`, `atoms`, `molecules`, `organisms`), each exported by name from `@fenaki/ui`. Astro renders them as static HTML and hydrates only interactive islands.
- Storybook as the living catalog (sidebar by level, foundations pages generated from the tokens), with accessibility and visual regression tests.

`design/system/` holds the brand book (`README.md`) and the validated prototype the packages were ported from (frozen: its own tokens and bundle keep the first names); the packages are the source of truth. Token names never use the brand metaphors (sala, tungsteno, telón); `packages/tokens/test/old-names.test.ts` fails on the old names. The product (web, apps, TV) is dark only, with no theme switcher; the light mode is only for the newsletter, the sponsor dossier and print/PDF documents. Never hardcode a color, size or font, and never build a one-off button or card inside a page: add or change the component in `packages/ui`.

Monorepo (pnpm + Turborepo): `apps/web` (Astro), `apps/cms` (Payload), `packages/tokens`, `packages/ui`, `packages/i18n`.

### Data model invariants

- A **short** and its **sources** are separate entities: a short has one or more sources (provider, external id, embeddable flag, last check, status), each tied to a **license** (route: embed, open, direct). This lets a short move from embed to self-hosted without changing its page or URL.
- Translatable text (title, slug, synopsis, bio, collection title/description) uses Payload localized fields, one value per locale.
- Viewers are `members`, a separate auth collection from the staff `users`; their list, ratings and viewings are owner-only rows (one per member and short). Anything that checks "is signed in" in the CMS must check for a staff account (`isStaffAccount`), or a viewer passes. The browser never calls the CMS for accounts: the site's `/api/account/*` routes do, and keep the token in an `httpOnly` cookie.
- Full entity list: `private/plan/plan-de-desarrollo.md`, section "Modelo de datos".

### Legal constraints that affect code

- Only embed from official channels (author, producer, festival); respect disabled embeds. Every short records its legal route.
- Third-party embeds load only after consent: pressing play opens a dialog that says what the provider receives (IP address, what its player stores in the browser) and the player loads on «Aceptar y reproducir». The viewer may have it remembered per provider (`localStorage`, withdrawn at `/es/preferencias-de-reproduccion`). No site-wide cookie banner until a cookie-based tool arrives (then CookieYes).
- No ads or sponsorship inside or tied to the player; sponsorship attaches to the collection page, newsletter and site. Sponsored collections must exclude NC-licensed shorts.
- Use the YouTube API for ingestion only and cache metadata in the database, not per page view.
- Broken or privatized embeds found by the nightly checker hide the short automatically and flag it in the admin panel.

## Language conventions

| Area                                                   | Language                               |
| ------------------------------------------------------ | -------------------------------------- |
| Code, identifiers, commits, code comments              | English                                |
| Technical docs (READMEs, architecture, API, this file) | English                                |
| Planning, daily log, user-facing docs                  | Spanish                                |
| UI                                                     | Spanish at launch, English added later |

## i18n rules (from the first commit)

- No hardcoded user-facing strings in components. Every string comes from locale files (`locales/es.json`), with English keys.
- The brand is always written **FENAKI**, in capitals, in every user-facing text (UI, legal pages, emails, sender names, labels). Lowercase only in the domain and addresses (`fenaki.tv`, `hola@fenaki.tv`) and in identifiers.
- Say **email**, never «correo» or «correo electrónico», in every user-facing text (web, apps, emails).
- Never pitch FENAKI as «gratis y legales» (or «gratuitos y legales») in marketing copy: titles, taglines, descriptions, OG cards, social posts. It has no pull. Lead with the tagline «El mejor cine, en cortos» and with having every short in one place. Never call FENAKI curated or say its shorts are «elegidos uno a uno»: it goes for volume. The legal route still belongs in legal texts and short pages, as a fact, not a selling point.
- UI copy is neutral Spanish for all Spanish speakers: address the user as «tú», never «vosotros», and avoid Spain-only vocabulary. Locale code is `es`, not `es-ES`.
- Locale-prefixed routes (`/es/...`) even while `es` is the only locale.
- Format dates, durations and numbers with `Intl`.
- Editorial content (titles, slugs, synopses, bios, collection descriptions) must be translatable per locale. How it is stored is up to the tool (Payload localized fields).
- User docs live under `docs/es/` so `docs/en/` can be added without restructuring.

## Daily log

Write the day's entry as work happens, not only at the end: update `private/diario/dia-NN.md` (template: `private/diario/plantilla.md`) and the index in `private/diario/README.md`: what was done, decisions, learnings, how AI helped, metrics, next steps and a social media draft. Write it in Spanish. Hours count from the user's start time for the day. The social post is published the next morning, or scheduled the same night, never in real time.
