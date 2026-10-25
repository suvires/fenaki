# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Shortix

Curated catalog of free, legally available short films with a streaming-style UX (shortix.film). Independent brand. Built in public as a 30-day challenge ("Día N de 30") with Claude Code.

- Product plan (Spanish): `private/plan/plan-de-desarrollo.md`
- Daily challenge log (Spanish): `private/diario/`

`private/` is gitignored here and versioned as its own private repository. It holds the plan, the daily log, expenses, the user's tasks, contacts and any business or personal data. Clones of the public repo do not have it.

## Working model

The challenge is an experiment: Claude does all the work (code, catalog curation, content, social media, sales prep) and the user supervises, validates and proposes. Act proactively and bring results for validation instead of handing tasks back. Only acts that legally or contractually require the user's identity stay with them: signing contracts, issuing invoices (they bill as a Spanish autónomo), payments and creating accounts. Log every expense in `private/diario/gastos.md`, and keep the user's to-do list in `private/plan/tus-tareas.md` up to date (add tasks as they come up, tell the user when each is due).

## Public repository

The repo is public on GitHub (free Actions minutes, build-in-public). Never commit secrets (use GitHub secrets and env vars, read by Kamal) or third-party personal data (festival and school contacts, sponsor details): those live in the database or in `private/`. Anything outside `private/` is public. Commit author email is suvires@gmail.com (never the user's work email); the repo lives under the GitHub account `suvires`.

## Status

The monorepo is scaffolded and runs locally. Deployment is configured and rehearsed locally but nothing is deployed yet: runbook in `docs/deploy.md`. Setup and every command are in `README.md`. From the root:

- `docker compose up -d`: PostgreSQL, Meilisearch, listmonk, Mailpit (local SMTP) and Umami for development.
- `pnpm migrate`: applies the Payload migrations (the schema never changes by push, in development either).
- `pnpm import:catalog`: the real catalog from `CATALOG_IMPORT_PATH` (outside this repo), idempotent.
- `pnpm setup:services`: listmonk lists, SMTP and confirmation email, and the Umami website.
- `pnpm dev`: site (<http://localhost:4321/es/>), CMS admin (<http://localhost:3000/admin>) and the jobs worker. `SITE_MODE` in `apps/web/.env` switches between the pre-launch `landing` and the full `catalog`.
- `pnpm seed`: admin user, six sample shorts and one sponsored collection, all flagged as sample data (empty databases only; the e2e tests use it on their own database).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright smoke test), `pnpm build`.
- `pnpm storybook`: the component catalog.
- `pnpm test:visual` (`:update` to accept changes): screenshots of every story compared with committed baselines, in the Playwright Docker image; CI runs the same on every push and pull request. Any UI change needs updated baselines in the same commit, generated on arm64 only (no pixel tolerance). CI also runs lint, typecheck and test on every push and pull request.
- One test: `pnpm --filter <package> exec vitest run <file>` or `-t "<name>"`.

After changing a Payload collection, run `pnpm --filter @shortix/cms migrate:create <name>` and `pnpm --filter @shortix/cms generate:types`, and commit the migration and `payload-types.ts`; the site imports those types.

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
- **Deploy:** Kamal (validated) to a single OVHcloud VPS-2 (4 vCores, 8 GB) for now, kamal-proxy for HTTPS, images on GitHub Container Registry, off-site backups and external uptime monitoring. Adding servers later is a config change. The MVP never serves video: playback is the official YouTube/Vimeo embed. Own video comes in phase 3 on Bunny Stream (preferred: EU, token-signed URLs, optional DRM for rentals).
- **Later:** mobile and TV apps in phase 5, consuming the same API; React Native + Expo vs fully native apps is undecided. Mobile during the challenge is a fast, installable web (manifest only, no offline mode).

### Design system

All UI goes through the design system (validated). Three layers:

- `packages/tokens`: single source of design tokens (color, type, spacing, radius, shadow, motion), exposed as CSS variables in Tailwind v4 `@theme`; later also generated for the native apps.
- `packages/ui`: React components built on accessible primitives (Radix / shadcn/ui), using tokens only. Astro renders them as static HTML and hydrates only interactive islands.
- Storybook as the living catalog, with accessibility and visual regression tests.

The validated visual direction lives in `design/system/`: brand book (`README.md`), tokens (`tokens.json`, compiled to `tokens.css`), a prototype component bundle with guidelines and previews, and a local gallery (`index.html`). Port it into `packages/tokens` and `packages/ui` when scaffolding; from then on the packages are the source of truth. The product (web, apps, TV) is dark only, with no theme switcher; the light palette is only for the newsletter, the sponsor dossier and print/PDF documents. Never hardcode a color, size or font, and never build a one-off button or card inside a page: add or change the component in `packages/ui`.

Monorepo (pnpm + Turborepo): `apps/web` (Astro), `apps/cms` (Payload), `packages/tokens`, `packages/ui`, `packages/i18n`.

### Data model invariants

- A **short** and its **sources** are separate entities: a short has one or more sources (provider, external id, embeddable flag, last check, status), each tied to a **license** (route: embed, open, direct). This lets a short move from embed to self-hosted without changing its page or URL.
- Translatable text (title, slug, synopsis, bio, collection title/description) uses Payload localized fields, one value per locale.
- Full entity list: `private/plan/plan-de-desarrollo.md`, section "Modelo de datos".

### Legal constraints that affect code

- Only embed from official channels (author, producer, festival); respect disabled embeds. Every short records its legal route.
- Third-party embeds load only after cookie consent.
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
- UI copy is neutral Spanish for all Spanish speakers: address the user as «tú», never «vosotros», and avoid Spain-only vocabulary. Locale code is `es`, not `es-ES`.
- Locale-prefixed routes (`/es/...`) even while `es` is the only locale.
- Format dates, durations and numbers with `Intl`.
- Editorial content (titles, slugs, synopses, bios, collection descriptions) must be translatable per locale. How it is stored is up to the tool (Payload localized fields).
- User docs live under `docs/es/` so `docs/en/` can be added without restructuring.

## Daily log

Write the day's entry as work happens, not only at the end: update `private/diario/dia-NN.md` (template: `private/diario/plantilla.md`) and the index in `private/diario/README.md`: what was done, decisions, learnings, how AI helped, metrics, next steps and a social media draft. Write it in Spanish. Hours count from the user's start time for the day. The social post is published the next morning, or scheduled the same night, never in real time.
