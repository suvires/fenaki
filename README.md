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
- Mailpit: <http://localhost:8025>: every email sent locally lands here (the waitlist's and, once `SMTP_HOST` is set in `apps/cms/.env`, the accounts'); nothing reaches a real inbox
- Umami: <http://localhost:3001> (`admin` / `umami`): visits and events of the Fenaki website
- Storybook: <http://localhost:6006> after `pnpm storybook`

`pnpm dev` keeps running in the foreground; stop it with Ctrl+C. `docker compose stop` stops the services and keeps their data.

### Landing or catalog

`SITE_MODE` in `apps/web/.env` decides what the site is (restart `pnpm dev` after changing it):

- `landing`: the pre-launch page. `/es/` is the landing page with the waitlist and a sample of one launch collection; the short, browse, collection, person, showcase and search routes answer 404.
- `catalog`: the full site.

The sponsorship page (`/es/patrocina`) is public in both modes.

`CONTACT_EMAIL` is the public contact mailbox. While it is empty, the links that would write to it («Proponer un corto», the sponsorship links in the footer) are hidden, so the site never points to an address that does not receive mail.

Both modes serve the legal pages (`/es/aviso-legal`, `/es/privacidad`, `/es/cookies`, `/es/retirada-de-contenidos`), linked from the footer. `LEGAL_DRAFT=true` adds a «Borrador» notice to them (off in production since 26 oct 2026).

To try the waitlist: with `SITE_MODE=landing`, sign up at <http://localhost:4321/es/#waitlist>, open the confirmation email in Mailpit, follow its link, and check in listmonk that the subscriber's lists are «confirmed».

### Viewer accounts

With `SITE_MODE=catalog` the site has viewer accounts: sign up at <http://localhost:4321/es/crear-cuenta>, and the verification email lands in Mailpit (set `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` and `SMTP_TLS=none` in `apps/cms/.env`, as `.env.example` shows; with `SMTP_HOST` empty the email is written to the CMS console instead). Its link goes to the site (`/es/cuenta/verificar?token=…`), built from `WEB_URL` in `apps/cms/.env`, which must be the site's public address. The password-reset email works the same way (`/es/cuenta/restablecer`).

`pnpm seed` creates a verified sample member to sign in with at once; its email and password are `SAMPLE_MEMBER` in `apps/cms/src/seed/data.ts` (test values, flagged as sample data). Staff and viewers are separate: staff are `users` (admin and the AI agent) and sign in at `/admin`; viewers are `members` and never reach the admin panel (the admin only reads them, for support and data requests).

What a signed-in viewer gets: «Mi lista» and ratings in their account instead of the browser's `localStorage` (what the browser had is merged into the account at sign-in), «Seguir viendo» and a history (the player's progress, saved every ~15 seconds), a page to change their name and password, download their data and delete the account. Anonymous viewers are never tracked. The browser never talks to the CMS for any of it: the site's `/api/account/*` routes do, server to server, and keep Payload's token in an `httpOnly` cookie (`fenaki-session`, `__Host-fenaki-session` over HTTPS). The deployment notes are in `docs/deploy.md`.

`pnpm dev` runs the site, the CMS and the jobs worker together. The worker is a separate process (`payload jobs:run`) that polls Payload's job queue every 10 seconds: publishing or editing a short queues an `indexShort` job that syncs it to Meilisearch (one index per locale, `shorts_es`).

### Catalog data

`pnpm import:catalog` loads the real catalog from the JSON file at `CATALOG_IMPORT_PATH`, which lives outside this public repository. It creates or updates people, licenses, shorts, sources and collections, matched by the stable keys of the file (`importKey`), so running it again updates and never duplicates. Only shorts marked for launch are published; the rest stay drafts, and a short withdrawn in the admin panel stays withdrawn. Collections with at least one launch short are published. Which collection is featured (the home hero and the landing sample) is an editorial choice: the import features the first collection of the file when it creates them, unless the file says otherwise, and never changes it afterwards. The import removes the sample data first.

`pnpm seed` loads sample data instead, for an empty database: real Spanish shorts so layouts read true, with placeholder video ids and a fictional sponsor, all marked `sample: true`. Sample shorts show a placeholder instead of a player. The sample and real catalogs share slugs, so the seed refuses to run on a database with real shorts; the e2e tests use their own database with the seed.

### Adding shorts and checking embeds

In the admin panel, the shorts list starts with «Añadir un corto desde una URL»: paste a YouTube or Vimeo link and Fenaki creates the short and its source, pending review («Pendiente de revisión»), with what the provider says: title, official channel, thumbnail and embeddability from the public oEmbed endpoints, plus running time, channel id, language and age restriction from the YouTube Data API when `YOUTUBE_API_KEY` is set, and year, country and language from TMDB when `TMDB_API_KEY` is set. Without keys it still works (YouTube's oEmbed has no running time: the editor fills it in). Duplicates and videos that are missing, private, not embeddable or age restricted are refused. Nothing is published automatically.

Each source records its official channel (name, who runs it, URL) and the evidence that it is official. An editor cannot publish a short until one of its sources has both; the catalog import fills them from the catalog file.

Every night at 03:00 the jobs worker runs `checkEmbeds`: it asks oEmbed (and the YouTube Data API, 50 videos per request, when there is a key) about every source of the published shorts, stores the result on the source and withdraws the shorts that can no longer play, recording why and when. An unanswered request changes nothing. «Problemas de embeds» in the admin navigation lists the hidden shorts and the sources with problems, with a button to run the check now. A hidden short stays withdrawn until an editor fixes it and publishes it again. Pages never ask the providers: everything is read from the database.

### Official channels

FENAKI goes for volume, so an editor registers an official channel once and its new shorts reach the review queue by themselves. In `Catálogo › Canales`, add the channel URL (YouTube `@handle`, `/channel/UC…` or `/user/…`; Vimeo user or `vimeo.com/channels/<slug>`), who runs it, the evidence that it is official (copied to every short the scan adds) and, if you want, its organization. On save Fenaki fills in the provider, the channel id and the name. The filters default to 2–45 minutes (`minDurationSeconds`, `maxDurationSeconds`) and an optional spoken language used when the provider does not say. YouTube channels need `YOUTUBE_API_KEY`; Vimeo works without a key (see below) and lists more with `VIMEO_ACCESS_TOKEN`.

Every night at 02:30 the jobs worker runs `scanChannels` over the active channels, one by one, so a failing channel stops nothing. For each one it lists the channel's videos and creates a short and its source, pending review, exactly as «Añadir un corto desde una URL» does, with the channel and its evidence on the source. Nothing is published: an editor checks each short and publishes it. Each scan writes what it found, added and skipped, and why, on the channel («Última búsqueda»). «Buscar cortos nuevos ahora» on a channel runs a short scan right away (at most 150 videos: a web request cannot read a long backlog). To work the queue of one channel, filter the shorts list by `Pendiente de revisión` and by the `Canal de búsqueda` field.

**The whole backlog, not just the latest videos.** A channel's history is read from its newest video to its first. YouTube pages through the uploads playlist (`playlistItems.list`: 50 per page, one quota unit; `videos.list` is another unit per 50 videos). A run lists at most 2,000 videos per channel and saves where it stopped (`Posición en el historial`), so a longer backlog continues the next night; `Historial completo revisado` turns on when the end is reached. Channels registered before this existed read their backlog on the next nightly run. «Revisar todo el canal» (on the channel's page) flags it to be read again from the start and queues the scan; what the ledger already settled is skipped, so repeating it is cheap. Once the backlog is read, a scan stops at the first page it already knows entirely.

Vimeo's RSS feed ignores pagination and only has the latest ten videos, so Vimeo is listed three ways, best first: with `VIMEO_ACCESS_TOKEN` the Vimeo API lists a user or channel (100 per page) and describes each video, including its language and subtitle tracks; without it, a user's public video pages (`vimeo.com/<user>/videos/page:N/sort:date`) are walked (ids only; oEmbed gives the rest); and for a channel (`vimeo.com/channels/<slug>`), which has no readable public pages, the RSS feed. To get the token, create a free app at developer.vimeo.com, generate an access token with the public scope and put it in `VIMEO_ACCESS_TOKEN`.

**Vídeos escaneados.** `Catálogo › Vídeos escaneados` holds one row per video any scan has looked at (unique per provider and id): its channel, title, duration, whether it was added (with the short) or skipped and why (`ya está en el catálogo`, privado, inserción desactivada, restringido por edad, no disponible, duración desconocida, demasiado corto/largo, tráiler o similar, no está en un idioma del catálogo, o `no se pudo comprobar`), its languages and a note. The scanner reads the ledger before doing any work on a video, so nothing is fetched or judged twice: the rows that failed are tried again every night, and the skipped ones only when an editor presses «Volver a evaluar» (on the row, or per reason on the channel's page — e.g. after widening the duration range). From a skipped row «Añadir al catálogo» brings the video in by hand, like «Añadir un corto desde una URL». Each channel's page lists its scanned videos with the counts per outcome and reason. The migration filled the ledger with every video that was already a source.

**Languages.** The catalog is Spanish for now (`Catálogo › Ajustes del catálogo › Idiomas del catálogo`; add a language and re-evaluate the channels' `no está en un idioma del catálogo` rows to bring those in). A short enters when it is spoken in a catalog language, has no dialogue (`zxx`), or is spoken in another with subtitles in a catalog language. Every video's languages are recorded, skipped ones too, with where they came from (`proveedor`, `canal` = the channel's default language, `IA`, `editor`; an editor's value is never replaced): the short's `originalLanguage` + `otherLanguages` + `noDialogue`, and the source's `subtitles` (human), `autoSubtitles` and `captions`. YouTube gives `defaultAudioLanguage` / `defaultLanguage` for free in `videos.list`, and only whether a caption track exists (`contentDetails.caption`), not its language: the language of the tracks is in `captions.list`, which costs 50 quota units a call and needs the owner's OAuth, so it is not used. A foreign-language YouTube video with a caption track passes, for the editor to check; without one it is left out. Vimeo's tracks come from `/videos/{id}/texttracks` with the token (one call, only for videos spoken outside the catalog).

### AI review

With `ANTHROPIC_API_KEY` set, Claude prepares a proposal for every short in the review queue, shown in the short's page under «Propuesta de la IA» (read-only): whether it is a complete short (and if not, a trailer, making of, episode, ad, gala, clip…), the spoken language and whether it has Spanish subtitles, a clean title, year, country, credits found in the description, type and technique, branded content, restrictions quoted from the text («all rights reserved» is not one), signs of a re-upload, a synopsis in neutral Spanish, and a recommendation: `Publicar`, `Descartar` or `Necesita una persona`, with a one-line reason. It sees the title, description, duration, channel, language metadata, the license and the thumbnail. Nothing is published and nothing an editor wrote is overwritten: «Aplicar propuesta» copies the proposal only into fields that are still empty (the spoken language also replaces a value that was only the channel's default); «Analizar con IA» asks again for one short. The shorts list filters by `Propuesta de la IA › Recomendación`.

A short added from a URL (or by a scan that adds ten or fewer) is analysed right away by a `reviewShort` job, one normal request. Every night at 04:00 `reviewBacklog` collects the Message Batches that ended and submits the shorts in review without an analysis (up to 500) as a new one, at half price. Both happen only with `AI_REVIEW_AUTO=on`; with it off (production for now) the nightly job only collects the batches already sent, and batches are submitted by hand so the spend can be checked between them. The model is `claude-opus-5-5` (`AI_REVIEW_MODEL` changes it), with adaptive thinking and structured outputs; tokens used are logged per run. When the model declines, or the answer is cut off or malformed, the short is marked «Necesita una persona» with the reason. Without the key the feature is off and nothing else changes.

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

| Command               | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Site, CMS and jobs worker in watch mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm build`          | Builds the tokens, the site and the CMS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm lint`           | ESLint and Prettier check over the whole repo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm format`         | Formats everything with Prettier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm typecheck`      | TypeScript in every package (`astro check` for the site).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm test`           | Vitest unit tests: token build, i18n, formatting, catalog, search, import, waitlist, ingestion from URLs, the embed checker, showcase rules, browse filters and SEO helpers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pnpm test:e2e`       | Playwright tests of the catalog (home, short page, search, browse filters, person and showcase pages, structured data, OG images, sitemap, sponsorship page, viewer accounts: sign-up, the verification and reset emails read from Mailpit, «Mi lista», ratings and «Seguir viendo» on the account, deleting it) and the landing (waitlist with the confirmation email, hidden catalog routes, legal pages). Needs the Docker services and `pnpm setup:services`; runs on its own database and ports (see below). Install the browser once with `pnpm --filter @fenaki/web exec playwright install chromium`. It also runs the sales CRM integration test (`apps/cms/test/integration`: import, draft as agent, approve and send through Mailpit, Sent copy and reply sync against GreenMail, on its own database `fenaki_crm_test`), which needs `docker compose --profile test up -d greenmail`, and the viewer accounts integration test (sign-up and the verification email through Mailpit, who can read what, one row per member and short, erasure, on `fenaki_accounts_test`; run `docker compose up -d` once more so Compose creates that database on an existing volume). |
| `pnpm migrate`        | Applies pending database migrations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm import:catalog` | Imports the real catalog from `CATALOG_IMPORT_PATH`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm seed`           | Loads the sample catalog and the admin user (empty databases only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pnpm setup:services` | Configures listmonk (lists, SMTP, privacy settings, confirmation email) and Umami (website). Idempotent; run it again after changing the email copy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm storybook`      | Storybook for `packages/ui`, with the accessibility addon.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

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

The e2e tests never touch the development data. Playwright starts a CMS on port 3100 against the `fenaki_test` database (migrated and seeded on every start, `test_` search indexes) and one production build of the site, served in catalog mode on port 4400 and in landing mode on port 4401. All of them stop when the run ends. To run a second copy at the same time (another checkout), move it aside with `E2E_CMS_PORT`, `E2E_CATALOG_PORT`, `E2E_LANDING_PORT`, `E2E_DATABASE` (create the database first) or `E2E_DATABASE_URL` (another PostgreSQL) and `E2E_INDEX_PREFIX`. The waitlist test signs up a unique `e2e+…@example.com` address, reads the email from Mailpit and deletes the subscriber from listmonk afterwards. The account tests do the same with their own addresses and delete the accounts they create; the e2e CMS sends through Mailpit and links to the site under test (`WEB_URL`), and each test comes from its own client address (the `CF-Connecting-IP` header), so the rate limits of one never affect another.

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

- `apps/cms/.env`: `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `WEB_URL` (the site's public address: CORS and the links in the account emails), `MEILISEARCH_HOST`, `MEILISEARCH_ADMIN_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `CATALOG_IMPORT_PATH`, and optionally `SEARCH_INDEX_PREFIX`, `YOUTUBE_API_KEY`, `TMDB_API_KEY`, `VIMEO_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`, `AI_REVIEW_MODEL` and `AI_REVIEW_AUTO`, the `SMTP_*` and `EMAIL_FROM_*` variables (Payload's emails: viewers' account verification and password reset; without `SMTP_HOST` they go to the console), `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `UMAMI_USERNAME` and `UMAMI_PASSWORD` (the nightly job that ranks «Lo más visto» from the `play` events of the last 7 days; without them it does nothing) and `SENTRY_DSN`.
- `apps/web/.env`: `CMS_URL`, `CMS_PUBLIC_URL`, `MEILISEARCH_HOST`, `MEILISEARCH_SEARCH_KEY` (a search-only key in production), `SEARCH_INDEX_PREFIX`, `SITE_URL` (also the origin the account routes accept requests from, and whether the session cookie is `Secure`), `SITE_MODE`, `LAUNCH_DATE`, `LEGAL_DRAFT`, `CONTACT_EMAIL`, the `LISTMONK_*` and `UMAMI_*` variables, `TOP10_PREVIEW` (development only: fills the «Lo más visto» rail with the 10 latest shorts to work on its design; ignored in production, where the rail appears only once the CMS has a real ranking of 10), and `SENTRY_DSN`.

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
