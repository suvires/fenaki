# Fenaki

Curated catalog of free, legally available short films with a streaming-style UX ([fenaki.tv](https://fenaki.tv)). Built in public as a 30-day challenge.

This repository is a pnpm + Turborepo monorepo:

| Path              | What it is                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web`        | Public site: Astro with SSR (Node adapter), locale-prefixed routes, React islands.                 |
| `apps/cms`        | Payload CMS 3 (Next.js): admin panel, REST API, background jobs, seed.                             |
| `packages/tokens` | Design tokens. `tokens.json` is the single source; a build script generates the Tailwind v4 theme. |
| `packages/ui`     | React components on tokens and Radix primitives, with Storybook.                                   |
| `packages/i18n`   | Locale files with typed access, and `Intl` formatting helpers.                                     |
| `design/system`   | The validated design reference the packages were ported from. Read only.                           |

## Requirements

- Node 26.11 (see `.nvmrc`; `nvm use` picks it up).
- pnpm 12. Any recent pnpm switches to the version in `packageManager` automatically.
- Docker. On macOS with OrbStack, start the daemon with `open -a OrbStack`.

## Setup

```sh
docker compose up -d                       # PostgreSQL, Meilisearch, listmonk, Mailpit and Umami
pnpm install
cp apps/cms/.env.example apps/cms/.env     # then set PAYLOAD_SECRET (openssl rand -hex 32)
                                           # and CATALOG_IMPORT_PATH (absolute path to import.json)
cp apps/web/.env.example apps/web/.env
pnpm migrate                               # create or update the database schema
pnpm import:catalog                        # the real catalog and the admin user
pnpm setup:services                        # listmonk lists, SMTP and email template; Umami website
pnpm dev
```

Then open:

- Site: <http://localhost:4321/es/> (`/` redirects there)
- Admin: <http://localhost:3000/admin> (user and password from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `apps/cms/.env`)
- listmonk: <http://localhost:9000/admin> (`admin` / `fenaki-dev-admin`): waitlist subscribers under Subscribers
- Mailpit: <http://localhost:8025>: every email sent locally lands here; nothing reaches a real inbox
- Umami: <http://localhost:3001> (`admin` / `umami`): visits and events of the Fenaki website
- Storybook: <http://localhost:6006> after `pnpm storybook`

`pnpm dev` keeps running in the foreground; stop it with Ctrl+C. `docker compose stop` stops the services and keeps their data.

### Landing or catalog

`SITE_MODE` in `apps/web/.env` decides what the site is (restart `pnpm dev` after changing it):

- `landing`: the pre-launch page. `/es/` is the landing page with the waitlist and a sample of one launch collection; the short, browse, collection, person, showcase and search routes answer 404.
- `catalog`: the full site.

The sponsorship page (`/es/patrocina`) is public in both modes.

`CONTACT_EMAIL` is the public contact mailbox. While it is empty, the links that would write to it («Proponer un corto», the sponsorship links in the footer) are hidden, so the site never points to an address that does not receive mail.

Both modes serve the legal pages (`/es/aviso-legal`, `/es/privacidad`, `/es/cookies`, `/es/retirada-de-contenidos`), linked from the footer. While `LEGAL_DRAFT=true` they show a «Borrador» notice: the texts are pending a lawyer's review.

To try the waitlist: with `SITE_MODE=landing`, sign up at <http://localhost:4321/es/#waitlist>, open the confirmation email in Mailpit, follow its link, and check in listmonk that the subscriber's lists are «confirmed».

`pnpm dev` runs the site, the CMS and the jobs worker together. The worker is a separate process (`payload jobs:run`) that polls Payload's job queue every 10 seconds: publishing or editing a short queues an `indexShort` job that syncs it to Meilisearch (one index per locale, `shorts_es`).

### Catalog data

`pnpm import:catalog` loads the real catalog from the JSON file at `CATALOG_IMPORT_PATH`, which lives outside this public repository. It creates or updates people, licenses, shorts, sources and collections, matched by the stable keys of the file (`importKey`), so running it again updates and never duplicates. Only shorts marked for launch are published; the rest stay drafts, and a short withdrawn in the admin panel stays withdrawn. Collections with at least one launch short are published. Which collection is featured (the home hero and the landing sample) is an editorial choice: the import features the first collection of the file when it creates them, unless the file says otherwise, and never changes it afterwards. The import removes the sample data first.

`pnpm seed` loads sample data instead, for an empty database: real Spanish shorts so layouts read true, with placeholder video ids and a fictional sponsor, all marked `sample: true`. Sample shorts show a placeholder instead of a player. The sample and real catalogs share slugs, so the seed refuses to run on a database with real shorts; the e2e tests use their own database with the seed.

### Adding shorts and checking embeds

In the admin panel, the shorts list starts with «Añadir un corto desde una URL»: paste a YouTube or Vimeo link and Fenaki creates the short and its source, pending review («Pendiente de revisión»), with what the provider says: title, official channel, thumbnail and embeddability from the public oEmbed endpoints, plus running time, channel id, language and age restriction from the YouTube Data API when `YOUTUBE_API_KEY` is set, and year, country and language from TMDB when `TMDB_API_KEY` is set. Without keys it still works (YouTube's oEmbed has no running time: the editor fills it in). Duplicates and videos that are missing, private, not embeddable or age restricted are refused. Nothing is published automatically.

Each source records its official channel (name, who runs it, URL) and the evidence that it is official. An editor cannot publish a short until one of its sources has both; the catalog import fills them from the catalog file.

Every night at 03:00 the jobs worker runs `checkEmbeds`: it asks oEmbed (and the YouTube Data API, 50 videos per request, when there is a key) about every source of the published shorts, stores the result on the source and withdraws the shorts that can no longer play, recording why and when. An unanswered request changes nothing. «Problemas de embeds» in the admin navigation lists the hidden shorts and the sources with problems, with a button to run the check now. A hidden short stays withdrawn until an editor fixes it and publishes it again. Pages never ask the providers: everything is read from the database.

### Showcases

A showcase (`Patrocinio › Escaparates`) is a festival's, film school's or institution's page at `/es/escaparates/<slug>`: logo, name, short text, website, its own ordered selection and an optional «Presentado por» credit. Only shorts with an official channel on record, never NC ones, no branded content when someone presents it, and a festival's showcase is published only after the editor ticks that no short is still on the festival circuit. Logos are uploads in the `Media` collection, stored in `apps/cms/media` (a persistent volume in production).

### Database migrations

The schema changes only through migrations in `apps/cms/src/migrations`, in development too (Payload's automatic schema push is off), so the first deployment runs exactly what was tested. After changing a collection:

```sh
pnpm --filter @fenaki/cms migrate:create <name>   # generate a migration from the schema change
pnpm migrate                                       # apply pending migrations
pnpm --filter @fenaki/cms generate:types          # and regenerate payload-types.ts
```

Payload writes `import { MigrateUpArgs, MigrateDownArgs, sql }` at the top of a new migration; mark the two types `type` (`import { sql, type MigrateDownArgs, type MigrateUpArgs }`) or `pnpm migrate` fails under Node's type stripping. Commit the migration with the change. A database created before migrations existed (by the schema push) has to start again: `docker compose down -v && docker compose up -d`, then the setup above from `pnpm migrate`.

### Sales CRM

The admin group «Comercial» is a small sales CRM for outreach to festivals, schools and brands: **Organizations**, **Contacts** (each with the legal basis for writing to them and a «do not contact» mark) and **Messages**, plus the **Hoy** view (`/admin/today`): drafts waiting for approval with their «Aprobar y enviar» button, new replies, follow-ups due and the count per pipeline status. None of it is readable without signing in: the public API and the site never see it.

**Roles.** Every user has a role. An `admin` is the human; an `agent` is the AI coordinator, which signs in with an API key. An agent creates and edits organizations, contacts and _draft_ messages, and cannot approve or send; it cannot change the catalog or users either. Only an admin approves (the message records `approvedBy` and `approvedAt`), and sending requires an approved message. This is enforced in access control and hooks (`src/crm/messageGate.ts`), not in the UI, and covered by tests. Changing an approved message's text takes the approval back. Existing users became admins in the migration; the first account created in an empty CMS is an admin, any other new account is an agent until an admin says otherwise.

**Sending.** «Aprobar y enviar» (on the message and in Hoy) approves a draft and sends it through the mailbox's own SMTP (OVHcloud Zimbra; `MAILBOX_*` variables in `apps/cms/.env.example`, not SES), as `Fenaki <hola@fenaki.tv>`, with the footer from `packages/i18n` (who we are, privacy policy, reply «no» to opt out), a stored `Message-ID` and `In-Reply-To`/`References` when it answers a received message (field «En respuesta a»). It then appends a copy to the mailbox's Sent folder, sets the organization's last contact and follow-up date (the message's own, or 7 days later) and moves `to_contact` to `contacted`. It refuses a contact marked «do not contact», anything not approved by an admin, and more than `CRM_DAILY_SEND_LIMIT` (default 20) emails a day (Madrid time). A reply that says just «no» marks its contact «do not contact» by itself.

**Inbox.** The jobs worker reads the mailbox every 5 minutes (`syncInbox`, off while `MAILBOX_IMAP_HOST` is empty), read-only, and stores only replies that match the CRM (details in `docs/deploy.md`, «Sales CRM mailbox»). A stored reply is plain text without the quoted history, with attachment names only; a reply moves the organization to `replied` and clears its follow-up. Message bodies are always shown as text, never as HTML.

**Importing organizations.** `pnpm --filter @fenaki/cms import:organizations` reads the CSV at `CRM_IMPORT_PATH` (outside this repository; columns `nombre,tipo,pais,ciudad,web,proxima_edicion,por_que_encaja,producto_recomendado,contacto_publico,fuente,prioridad,notas`). It is idempotent: organizations are matched by name and website, and a second run never overwrites the status, dates or notes already worked on. A Contact is created only when `contacto_publico` is an email address (legal basis «address published for proposals», the `fuente` column as evidence); contact-form URLs stay in the organization's «Canal de propuestas». In production: `FENAKI_HOST=<server ip> infra/server/import-organizations.sh <path to the CSV>`.

**API for the agent.** In the admin, create a user with role `agent`, tick «Enable API Key» and save: the key appears on the user. Every request then carries `Authorization: users API-Key <key>`; everything below is Payload's REST API (`PAYLOAD_PUBLIC_SERVER_URL`, `/api/...`), and `where` filters are documented in Payload's docs.

```sh
API=https://cms.fenaki.tv/api; AUTH="Authorization: users API-Key $FENAKI_AGENT_KEY"

# Organizations to contact first (A priority, not contacted yet)
curl -H "$AUTH" "$API/organizations?where[priority][equals]=A&where[status][equals]=to_contact&limit=20&depth=0"
# Follow-ups due (any date up to now), and an organization's contacts
curl -H "$AUTH" "$API/organizations?where[nextFollowUpDate][less_than]=$(date -u +%FT%TZ)&where[status][in]=contacted,replied,proposal,negotiation"
curl -H "$AUTH" "$API/contacts?where[organization][equals]=12&where[doNotContact][equals]=false"

# Create a contact (email is lowercased; the legal basis and its evidence are required)
curl -H "$AUTH" -H 'Content-Type: application/json' "$API/contacts" -d '{"email":"propuestas@example.org","organization":12,"legalBasis":"published_for_proposals","legalEvidence":"https://example.org/bases"}'

# Draft an email: it stays a draft until an admin approves it. Add "replyingTo": <received message id> to thread a reply
curl -H "$AUTH" -H 'Content-Type: application/json' "$API/messages" -d '{"direction":"outbound","status":"draft","organization":12,"contact":57,"subject":"…","body":"Plain text, without the footer","followUpDate":"2026-11-20T00:00:00Z"}'
# Edit it while it is a draft
curl -X PATCH -H "$AUTH" -H 'Content-Type: application/json' "$API/messages/101" -d '{"body":"…"}'

# Replies nobody dealt with yet (the unanswered-replies filter), oldest first
curl -H "$AUTH" "$API/messages?where[direction][equals]=inbound&where[handled][equals]=false&sort=receivedAt&depth=1"
# Mark a reply as handled once it was answered or filed
curl -X PATCH -H "$AUTH" -H 'Content-Type: application/json' "$API/messages/130" -d '{"handled":true}'
# Messages waiting for the human, and what happened to the rest
curl -H "$AUTH" "$API/messages?where[status][in]=draft,approved,failed&depth=0"
```

An agent that tries to set `status` to `approved` gets a 403, and `POST /api/messages/:id/approve-and-send` answers 403 to anything but an admin. Pipeline status, notes, priority and dates of organizations are the agent's to edit.

## Commands

Run from the repository root.

| Command               | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Site, CMS and jobs worker in watch mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm build`          | Builds the tokens, the site and the CMS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm lint`           | ESLint and Prettier check over the whole repo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pnpm format`         | Formats everything with Prettier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `pnpm typecheck`      | TypeScript in every package (`astro check` for the site).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm test`           | Vitest unit tests: token build, i18n, formatting, catalog, search, import, waitlist, ingestion from URLs, the embed checker, showcase rules, browse filters and SEO helpers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm test:e2e`       | Playwright tests of the catalog (home, short page, search, browse filters, person and showcase pages, structured data, OG images, sitemap, sponsorship page) and the landing (waitlist with the confirmation email, hidden catalog routes, legal pages). Needs the Docker services and `pnpm setup:services`; runs on its own database and ports (see below). Install the browser once with `pnpm --filter @fenaki/web exec playwright install chromium`. It also runs the sales CRM integration test (`apps/cms/test/integration`: import, draft as agent, approve and send through Mailpit, Sent copy and reply sync against GreenMail, on its own database `fenaki_crm_test`), which needs `docker compose --profile test up -d greenmail`. |
| `pnpm migrate`        | Applies pending database migrations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm import:catalog` | Imports the real catalog from `CATALOG_IMPORT_PATH`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm seed`           | Loads the sample catalog and the admin user (empty databases only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm setup:services` | Configures listmonk (lists, SMTP, privacy settings, confirmation email) and Umami (website). Idempotent; run it again after changing the email copy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm storybook`      | Storybook for `packages/ui`, with the accessibility addon.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

One package or one test:

```sh
pnpm --filter @fenaki/i18n test                                   # one package
pnpm --filter @fenaki/i18n exec vitest run test/format.test.ts    # one file
pnpm --filter @fenaki/i18n exec vitest run -t "formatDuration"    # tests matching a name
pnpm --filter @fenaki/web exec playwright test -g "search"        # one smoke test
```

CMS-specific:

```sh
pnpm --filter @fenaki/cms jobs              # the jobs worker alone
pnpm --filter @fenaki/cms generate:types    # after changing a collection: regenerate payload-types.ts
pnpm --filter @fenaki/cms generate:importmap
pnpm --filter @fenaki/cms reindex           # rebuild the search indexes and apply their settings
```

Run `reindex` after changing the search document or its settings (`apps/cms/src/search/document.ts`); the jobs worker only syncs shorts as they change.

The site imports the CMS types from `apps/cms/src/payload-types.ts`, so regenerate and commit them when collections change.

## Continuous integration

Two GitHub Actions workflows run on every push and pull request, without secrets or paid services (a third, `deploy.yml`, deploys `main`; see Deployment):

- `.github/workflows/checks.yml`: `pnpm lint`, `pnpm typecheck` and `pnpm test`.
- `.github/workflows/visual.yml`: the visual regression tests.

The e2e tests never touch the development data. Playwright starts a CMS on port 3100 against the `fenaki_test` database (migrated and seeded on every start, `test_` search indexes) and one production build of the site, served in catalog mode on port 4400 and in landing mode on port 4401. All of them stop when the run ends. To run a second copy at the same time (another checkout), move it aside with `E2E_CMS_PORT`, `E2E_CATALOG_PORT`, `E2E_LANDING_PORT`, `E2E_DATABASE` (create the database first) or `E2E_DATABASE_URL` (another PostgreSQL) and `E2E_INDEX_PREFIX`. The waitlist test signs up a unique `e2e+…@example.com` address, reads the email from Mailpit and deletes the subscriber from listmonk afterwards.

The visual workflow runs the visual regression tests on every push and pull request, in the same Playwright image and on arm64 runners, the same architecture as Apple Silicon, so local baselines match CI exactly. It uses no secrets or paid services. When it fails, the job uploads the Playwright report with the expected, actual and diff images as an artifact.

When a visual change is intended, run `pnpm test:visual:update`, check the changed images, and commit them with the change.

Baselines are only accepted when generated on arm64 (Apple Silicon), the same architecture as the CI runner. The comparison has no pixel tolerance, and text renders slightly differently on x86, so `pnpm test:visual:update` refuses to run on other architectures.

## Deployment

Production is one OVHcloud VPS behind Cloudflare, deployed with Kamal: one image (`Dockerfile`) runs the site, the CMS and the jobs worker as three roles, with PostgreSQL, Meilisearch, listmonk, Umami, `cloudflared` and the backups as accessories (`config/deploy.yml`). The runbook, the secrets, monitoring and the restore drill are in [`docs/deploy.md`](docs/deploy.md).

- `bin/kamal <command>`: Kamal from its pinned image, the same on a laptop and in CI.
- `infra/local/rehearse.sh up`: rehearses a full deploy on this machine against a stand-in server (Docker only).
- `.github/workflows/deploy.yml` deploys every push to `main`, once the repository variable `DEPLOY_ENABLED` is `true`.
- `infra/cloudflare`: DNS, the tunnel and the redirects with OpenTofu. `infra/backup`: the backup image.

## Configuration

Each app reads its own `.env` (never committed; `.env.example` lists every variable):

- `apps/cms/.env`: `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `WEB_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_ADMIN_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `CATALOG_IMPORT_PATH`, and optionally `SEARCH_INDEX_PREFIX`, `YOUTUBE_API_KEY` and `TMDB_API_KEY`, the `SMTP_*` and `EMAIL_FROM_*` variables (Payload's emails; without `SMTP_HOST` they go to the console) and `SENTRY_DSN`.
- `apps/web/.env`: `CMS_URL`, `CMS_PUBLIC_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_SEARCH_KEY` (a search-only key in production), `SEARCH_INDEX_PREFIX`, `SITE_URL`, `SITE_MODE`, `LAUNCH_DATE`, `LEGAL_DRAFT`, `CONTACT_EMAIL`, the `LISTMONK_*` and `UMAMI_*` variables, and `SENTRY_DSN`.

Sentry (error tracking, server side only) is off while `SENTRY_DSN` is empty, so development and tests never report anything.

The site reads all of them when the server starts, not at build time, so one build serves either mode in any environment.

**Email.** listmonk sends through the SMTP server that `pnpm setup:services` writes into its settings from `LISTMONK_SMTP_HOST`, `LISTMONK_SMTP_PORT`, `LISTMONK_SMTP_AUTH` (`none`, `login`, `plain` or `cram`), `LISTMONK_SMTP_TLS` (`none`, `STARTTLS` or `TLS`), `LISTMONK_SMTP_USERNAME` and `LISTMONK_SMTP_PASSWORD`, with `LISTMONK_FROM_EMAIL` as sender. Locally that is Mailpit (`mailpit:1025`, no auth, as seen from the listmonk container), and Compose resets listmonk to Mailpit on every start, so development never sends real email. In production it is Amazon SES in an EU region: `email-smtp.<region>.amazonaws.com`, port 587, `login`, `STARTTLS`, and the SES SMTP credentials. The confirmation email is listmonk's transactional template `fenaki-waitlist-confirm-es`, generated from `packages/i18n` and the light palette; listmonk's own opt-in email is switched off.

The values in `docker-compose.yml` and the `.env.example` files are for local development only.

To start from an empty database and index (this also empties listmonk and Umami): `docker compose down -v && docker compose up -d`, then `pnpm migrate`, `pnpm import:catalog` and `pnpm setup:services`.

### Migrating a stack created before the rename (Shortix → Fenaki)

The product used to be called Shortix, and the local services lived in the Compose project `shortix` (PostgreSQL role and databases `shortix`, `listmonk`, `umami`). They are now `fenaki`. A stack with data from before the rename moves over once, keeping the Payload content and users, the listmonk subscribers and lists and the Umami statistics:

```sh
# stop `pnpm dev` (Ctrl+C) first, then:
scripts/migrate-local-to-fenaki.sh
pnpm --filter @fenaki/cms reindex     # Meilisearch is derived data: it starts empty and is rebuilt
pnpm setup:services
pnpm dev
```

The script dumps the old databases to `.migration-dump/` (gitignored), stops the old containers without removing them, starts the `fenaki` project, restores into fresh databases, renames what carried the old name inside the data (listmonk API user, list tags, template names, a subscriber attribute; the seeded admin email `@shortix.local`; the Umami website name) and rewrites the old names in `apps/cms/.env` and `apps/web/.env` (keeping `.env.pre-fenaki` copies). It is safe to run again: a migrated database is recognised and left alone (`FORCE=1` redoes it). The e2e database is not migrated: the tests recreate it. When everything works, `docker compose -p shortix down -v` deletes the old containers and volumes. Anyone who has no data to keep just runs `docker compose up -d` and the setup above.

## How it fits together

- Public routes: `/es/` (home), `/es/cortos` (browse with filters), `/es/cortos/<slug>`, `/es/colecciones/<slug>`, `/es/personas/<slug>`, `/es/escaparates/<slug>`, `/es/buscar`, `/es/patrocina` and the legal pages.
- The browse page's filters (duration band, original language, Spanish subtitles, animation or live action, type, country) are Meilisearch facets, read in one multi-search request. They are links, one URL per combination (`/es/cortos?duration=short&form=animation`), so they work without JavaScript and can be shared; filtered pages are `noindex` with the unfiltered page as canonical.
- SEO: every page has a canonical URL, `hreflang` alternates for each locale (pages with localized slugs pass their own), Open Graph and Twitter cards. Short pages carry `VideoObject` structured data, person pages `ProfilePage`, collections, showcases and the browse page `CollectionPage` with an `ItemList`. `/sitemap.xml` indexes one sitemap per locale (`/sitemap-es.xml`); before launch it lists only the public pages. `/robots.txt` points to it.
- OG images (`/og/es/cortos/<slug>.png` and the same for people, collections and showcases; `/og/es/site.png`, `browse.png`, `sponsor.png`) are typographic cards drawn from the design tokens and the self-hosted fonts with satori and sharp: never a film still. They are cached for a day.

- The site never touches the database: it reads the catalog through Payload's REST API (`apps/web/src/lib/cms.ts`) and searches through its own `/api/search` endpoint, so the browser never sees a Meilisearch key.
- Pages render the UI components as static HTML. Only the home filters, the player gate and the search field are hydrated islands.
- The player gate loads no third-party request until the viewer presses play.
- Every page is served with a Content Security Policy (`apps/web/src/lib/csp.ts`, Astro's `security.csp`): scripts and styles only from the site, by hash; frames only from the YouTube and Vimeo players; Umami and the CMS's media from their own origins. It applies to builds, not to `astro dev`; `e2e/csp.spec.ts` checks that no page breaks it.
- The waitlist lives in listmonk, never in the site's own storage: `/api/waitlist` subscribes the address as unconfirmed on double opt-in lists and sends the confirmation email; `/es/lista-de-espera/confirmar` confirms it through listmonk. Links expire 7 days after the last email and work once.
- Analytics are Umami, cookieless (no cookies, no local storage, no query strings sent). Custom events: `waitlist-signup`, `play` (the PlayerGate button) and `sponsor-click` (the sponsor credit, which links to the sponsor's site).
- The weekly selection goes out on Friday mornings, 09:00 Spanish time (`NEWSLETTER_SCHEDULE` in `packages/waitlist`); the waitlist confirmation page announces it.
- «Nuevo» marks the shorts published after `LAUNCH_DATE`, for 30 days. The catalog published before the launch is never «Nuevo», and while `LAUNCH_DATE` is empty or in the future no short is.
- Shorts made by or for a brand carry a «Contenido de marca» badge on cards and their page, and sponsored collections reject them, as they reject NC licenses.
- Sponsored collections reject shorts under non-commercial (NC) licenses; signed license documents and internal notes are never readable through the public API.
- Content locales come from `packages/i18n`: adding `en` there enables it in Payload and in the routes.
