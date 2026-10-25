# Shortix

Curated catalog of free, legally available short films with a streaming-style UX ([shortix.film](https://shortix.film)). Built in public as a 30-day challenge.

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
- listmonk: <http://localhost:9000/admin> (`admin` / `shortix-dev-admin`): waitlist subscribers under Subscribers
- Mailpit: <http://localhost:8025>: every email sent locally lands here; nothing reaches a real inbox
- Umami: <http://localhost:3001> (`admin` / `umami`): visits and events of the Shortix website
- Storybook: <http://localhost:6006> after `pnpm storybook`

`pnpm dev` keeps running in the foreground; stop it with Ctrl+C. `docker compose stop` stops the services and keeps their data.

### Landing or catalog

`SITE_MODE` in `apps/web/.env` decides what the site is (restart `pnpm dev` after changing it):

- `landing`: the pre-launch page. `/es/` is the landing page with the waitlist and a sample of one launch collection; the short, collection and search routes answer 404.
- `catalog`: the full site.

`CONTACT_EMAIL` is the public contact mailbox. While it is empty, the links that would write to it («Proponer un corto», the sponsorship links in the footer) are hidden, so the site never points to an address that does not receive mail.

Both modes serve the legal pages (`/es/aviso-legal`, `/es/privacidad`, `/es/cookies`, `/es/retirada-de-contenidos`), linked from the footer. While `LEGAL_DRAFT=true` they show a «Borrador» notice: the texts are pending a lawyer's review.

To try the waitlist: with `SITE_MODE=landing`, sign up at <http://localhost:4321/es/#waitlist>, open the confirmation email in Mailpit, follow its link, and check in listmonk that the subscriber's lists are «confirmed».

`pnpm dev` runs the site, the CMS and the jobs worker together. The worker is a separate process (`payload jobs:run`) that polls Payload's job queue every 10 seconds: publishing or editing a short queues an `indexShort` job that syncs it to Meilisearch (one index per locale, `shorts_es`).

### Catalog data

`pnpm import:catalog` loads the real catalog from the JSON file at `CATALOG_IMPORT_PATH`, which lives outside this public repository. It creates or updates people, licenses, shorts, sources and collections, matched by the stable keys of the file (`importKey`), so running it again updates and never duplicates. Only shorts marked for launch are published; the rest stay drafts, and a short withdrawn in the admin panel stays withdrawn. Collections with at least one launch short are published. Which collection is featured (the home hero and the landing sample) is an editorial choice: the import features the first collection of the file when it creates them, unless the file says otherwise, and never changes it afterwards. The import removes the sample data first.

`pnpm seed` loads sample data instead, for an empty database: real Spanish shorts so layouts read true, with placeholder video ids and a fictional sponsor, all marked `sample: true`. Sample shorts show a placeholder instead of a player. The sample and real catalogs share slugs, so the seed refuses to run on a database with real shorts; the e2e tests use their own database with the seed.

### Database migrations

The schema changes only through migrations in `apps/cms/src/migrations`, in development too (Payload's automatic schema push is off), so the first deployment runs exactly what was tested. After changing a collection:

```sh
pnpm --filter @shortix/cms migrate:create <name>   # generate a migration from the schema change
pnpm migrate                                       # apply pending migrations
pnpm --filter @shortix/cms generate:types          # and regenerate payload-types.ts
```

Payload writes `import { MigrateUpArgs, MigrateDownArgs, sql }` at the top of a new migration; mark the two types `type` (`import { sql, type MigrateDownArgs, type MigrateUpArgs }`) or `pnpm migrate` fails under Node's type stripping. Commit the migration with the change. A database created before migrations existed (by the schema push) has to start again: `docker compose down -v && docker compose up -d`, then the setup above from `pnpm migrate`.

## Commands

Run from the repository root.

| Command               | What it does                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Site, CMS and jobs worker in watch mode.                                                                                                                                                                                                                                                                                                                 |
| `pnpm build`          | Builds the tokens, the site and the CMS.                                                                                                                                                                                                                                                                                                                 |
| `pnpm lint`           | ESLint and Prettier check over the whole repo.                                                                                                                                                                                                                                                                                                           |
| `pnpm format`         | Formats everything with Prettier.                                                                                                                                                                                                                                                                                                                        |
| `pnpm typecheck`      | TypeScript in every package (`astro check` for the site).                                                                                                                                                                                                                                                                                                |
| `pnpm test`           | Vitest unit tests: token build, i18n, formatting, catalog, search, import and waitlist helpers.                                                                                                                                                                                                                                                          |
| `pnpm test:e2e`       | Playwright tests of the catalog (home, short page, search) and the landing (waitlist with the confirmation email, hidden catalog routes, legal pages). Needs the Docker services and `pnpm setup:services`; runs on its own database and ports (see below). Install the browser once with `pnpm --filter @shortix/web exec playwright install chromium`. |
| `pnpm migrate`        | Applies pending database migrations.                                                                                                                                                                                                                                                                                                                     |
| `pnpm import:catalog` | Imports the real catalog from `CATALOG_IMPORT_PATH`.                                                                                                                                                                                                                                                                                                     |
| `pnpm seed`           | Loads the sample catalog and the admin user (empty databases only).                                                                                                                                                                                                                                                                                      |
| `pnpm setup:services` | Configures listmonk (lists, SMTP, privacy settings, confirmation email) and Umami (website). Idempotent; run it again after changing the email copy.                                                                                                                                                                                                     |
| `pnpm storybook`      | Storybook for `packages/ui`, with the accessibility addon.                                                                                                                                                                                                                                                                                               |

One package or one test:

```sh
pnpm --filter @shortix/i18n test                                   # one package
pnpm --filter @shortix/i18n exec vitest run test/format.test.ts    # one file
pnpm --filter @shortix/i18n exec vitest run -t "formatDuration"    # tests matching a name
pnpm --filter @shortix/web exec playwright test -g "search"        # one smoke test
```

CMS-specific:

```sh
pnpm --filter @shortix/cms jobs              # the jobs worker alone
pnpm --filter @shortix/cms generate:types    # after changing a collection: regenerate payload-types.ts
pnpm --filter @shortix/cms generate:importmap
```

The site imports the CMS types from `apps/cms/src/payload-types.ts`, so regenerate and commit them when collections change.

## Continuous integration

Two GitHub Actions workflows run on every push and pull request, without secrets or paid services (a third, `deploy.yml`, deploys `main`; see Deployment):

- `.github/workflows/checks.yml`: `pnpm lint`, `pnpm typecheck` and `pnpm test`.
- `.github/workflows/visual.yml`: the visual regression tests.

The e2e tests never touch the development data. Playwright starts a CMS on port 3100 against the `shortix_test` database (migrated and seeded on every start, `test_` search indexes) and one production build of the site, served in catalog mode on port 4400 and in landing mode on port 4401. All of them stop when the run ends. The waitlist test signs up a unique `e2e+…@example.com` address, reads the email from Mailpit and deletes the subscriber from listmonk afterwards.

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

- `apps/cms/.env`: `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `WEB_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_ADMIN_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `CATALOG_IMPORT_PATH`, and optionally `SEARCH_INDEX_PREFIX`, the `SMTP_*` and `EMAIL_FROM_*` variables (Payload's emails; without `SMTP_HOST` they go to the console) and `SENTRY_DSN`.
- `apps/web/.env`: `CMS_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_SEARCH_KEY` (a search-only key in production), `SEARCH_INDEX_PREFIX`, `SITE_URL`, `SITE_MODE`, `LAUNCH_DATE`, `LEGAL_DRAFT`, `CONTACT_EMAIL`, the `LISTMONK_*` and `UMAMI_*` variables, and `SENTRY_DSN`.

Sentry (error tracking, server side only) is off while `SENTRY_DSN` is empty, so development and tests never report anything.

The site reads all of them when the server starts, not at build time, so one build serves either mode in any environment.

**Email.** listmonk sends through the SMTP server that `pnpm setup:services` writes into its settings from `LISTMONK_SMTP_HOST`, `LISTMONK_SMTP_PORT`, `LISTMONK_SMTP_AUTH` (`none`, `login`, `plain` or `cram`), `LISTMONK_SMTP_TLS` (`none`, `STARTTLS` or `TLS`), `LISTMONK_SMTP_USERNAME` and `LISTMONK_SMTP_PASSWORD`, with `LISTMONK_FROM_EMAIL` as sender. Locally that is Mailpit (`mailpit:1025`, no auth, as seen from the listmonk container), and Compose resets listmonk to Mailpit on every start, so development never sends real email. In production it is Amazon SES in an EU region: `email-smtp.<region>.amazonaws.com`, port 587, `login`, `STARTTLS`, and the SES SMTP credentials. The confirmation email is listmonk's transactional template `shortix-waitlist-confirm-es`, generated from `packages/i18n` and the light palette; listmonk's own opt-in email is switched off.

The values in `docker-compose.yml` and the `.env.example` files are for local development only.

To start from an empty database and index (this also empties listmonk and Umami): `docker compose down -v && docker compose up -d`, then `pnpm migrate`, `pnpm import:catalog` and `pnpm setup:services`.

## How it fits together

- The site never touches the database: it reads the catalog through Payload's REST API (`apps/web/src/lib/cms.ts`) and searches through its own `/api/search` endpoint, so the browser never sees a Meilisearch key.
- Pages render the UI components as static HTML. Only the home filters, the player gate and the search field are hydrated islands.
- The player gate loads no third-party request until the viewer presses play.
- The waitlist lives in listmonk, never in the site's own storage: `/api/waitlist` subscribes the address as unconfirmed on double opt-in lists and sends the confirmation email; `/es/lista-de-espera/confirmar` confirms it through listmonk. Links expire 7 days after the last email and work once.
- Analytics are Umami, cookieless (no cookies, no local storage, no query strings sent). Custom events: `waitlist-signup`, `play` (the PlayerGate button) and `sponsor-click` (the sponsor credit, which links to the sponsor's site).
- The weekly selection goes out on Friday mornings, 09:00 Spanish time (`NEWSLETTER_SCHEDULE` in `packages/waitlist`); the waitlist confirmation page announces it.
- «Nuevo» marks the shorts published after `LAUNCH_DATE`, for 30 days. The catalog published before the launch is never «Nuevo», and while `LAUNCH_DATE` is empty or in the future no short is.
- Shorts made by or for a brand carry a «Contenido de marca» badge on cards and their page, and sponsored collections reject them, as they reject NC licenses.
- Sponsored collections reject shorts under non-commercial (NC) licenses; signed license documents and internal notes are never readable through the public API.
- Content locales come from `packages/i18n`: adding `en` there enables it in Payload and in the routes.
