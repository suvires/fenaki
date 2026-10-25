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
docker compose up -d                       # PostgreSQL 18 and Meilisearch, data in named volumes
pnpm install
cp apps/cms/.env.example apps/cms/.env     # then set PAYLOAD_SECRET (openssl rand -hex 32)
cp apps/web/.env.example apps/web/.env
pnpm seed                                  # admin user, six sample shorts, one sponsored collection
pnpm dev
```

Then open:

- Site: <http://localhost:4321/es/> (`/` redirects there)
- Admin: <http://localhost:3000/admin> (user and password from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `apps/cms/.env`)
- Storybook: <http://localhost:6006> after `pnpm storybook`

`pnpm dev` runs the site, the CMS and the jobs worker together. The worker is a separate process (`payload jobs:run`) that polls Payload's job queue every 10 seconds: publishing or editing a short queues an `indexShort` job that syncs it to Meilisearch (one index per locale, `shorts_es`).

The seed data is marked as sample (`sample: true`): real Spanish shorts so layouts read true, with placeholder video ids and a fictional sponsor. Sample shorts show a placeholder instead of a player. Running `pnpm seed` again replaces the sample data.

## Commands

Run from the repository root.

| Command          | What it does                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`       | Site, CMS and jobs worker in watch mode.                                                                                                                                                                                                          |
| `pnpm build`     | Builds the tokens, the site and the CMS.                                                                                                                                                                                                          |
| `pnpm lint`      | ESLint and Prettier check over the whole repo.                                                                                                                                                                                                    |
| `pnpm format`    | Formats everything with Prettier.                                                                                                                                                                                                                 |
| `pnpm typecheck` | TypeScript in every package (`astro check` for the site).                                                                                                                                                                                         |
| `pnpm test`      | Vitest unit tests: token build, i18n, formatting, catalog and search helpers.                                                                                                                                                                     |
| `pnpm test:e2e`  | Playwright smoke test of the home, a short page and search. Needs Docker services and the seed; starts the CMS and the site if they are not running. Install the browser once with `pnpm --filter @shortix/web exec playwright install chromium`. |
| `pnpm seed`      | Loads the sample catalog and the admin user.                                                                                                                                                                                                      |
| `pnpm storybook` | Storybook for `packages/ui`, with the accessibility addon.                                                                                                                                                                                        |

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

`.github/workflows/visual.yml` runs the visual regression tests on every push and pull request, in the same Playwright image and on arm64 runners, the same architecture as Apple Silicon, so local baselines match CI exactly. It uses no secrets or paid services. When it fails, the job uploads the Playwright report with the expected, actual and diff images as an artifact.

When a visual change is intended, run `pnpm test:visual:update`, check the changed images, and commit them with the change.

## Configuration

Each app reads its own `.env` (never committed; `.env.example` lists every variable):

- `apps/cms/.env`: `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `WEB_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_ADMIN_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- `apps/web/.env`: `CMS_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_SEARCH_KEY` (a search-only key in production).

The values in `docker-compose.yml` and the `.env.example` files are for local development only.

To start from an empty database and index: `docker compose down -v && docker compose up -d && pnpm seed`.

## How it fits together

- The site never touches the database: it reads the catalog through Payload's REST API (`apps/web/src/lib/cms.ts`) and searches through its own `/api/search` endpoint, so the browser never sees a Meilisearch key.
- Pages render the UI components as static HTML. Only the home filters, the player gate and the search field are hydrated islands.
- The player gate loads no third-party request until the viewer presses play.
- Sponsored collections reject shorts under non-commercial (NC) licenses; signed license documents and internal notes are never readable through the public API.
- Content locales come from `packages/i18n`: adding `en` there enables it in Payload and in the routes.
