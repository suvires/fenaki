# Deployment

Shortix runs on one OVHcloud VPS-2 (4 vCores, 8 GB, x86_64, Ubuntu 24.04) behind Cloudflare, deployed with [Kamal](https://kamal-deploy.org). This document is the first-deploy runbook, the day-to-day operations, monitoring and the restore drill.

- [How it is built](#how-it-is-built)
- [Secrets](#secrets)
- [First deploy](#first-deploy): [what the human does](#a-what-the-human-does), [what Claude runs](#b-what-claude-runs)
- [Day to day](#day-to-day)
- [Monitoring](#monitoring)
- [Backups and restore](#backups-and-restore)
- [Rehearsing locally](#rehearsing-locally)

## How it is built

```
visitor ─HTTPS─▶ Cloudflare (TLS, CDN, redirects, Access)
                    │  Cloudflare Tunnel (outbound connection from the server)
                    ▼
VPS ── cloudflared ─▶ kamal-proxy ─┬─ fenaki.tv         → web   (Astro, :4321)
       (accessory)   (routes by    ├─ cms.fenaki.tv     → cms   (Payload, :3000)
                      host)        ├─ listas.fenaki.tv  → listmonk
                                   └─ stats.fenaki.tv   → Umami
       jobs (Payload worker) · PostgreSQL · Meilisearch · backup ─▶ R2 or B2 (encrypted)
```

- **One image, three roles.** `Dockerfile` builds the site, the CMS and the jobs worker into one image (`ghcr.io/suvires/shortix`), so the three always run the same commit. `docker/app/shortix` picks the process (`web`, `cms`, `jobs`, `migrate`, `payload <args>`, `setup-services`). It is built for linux/amd64 from any machine and runs as the `node` user.
- **Migrations on deploy.** `cms` is Kamal's primary role: its container applies pending migrations, then starts. Kamal boots `web` and `jobs` only once the new CMS answers `/up`, so they never run against an unmigrated schema, and a failed migration fails the deploy while the previous version keeps serving. During the switch the old site still runs against the new schema for a few seconds, so **migrations must work with the previous version** (add columns before using them, drop them a release later).
- **Zero downtime.** kamal-proxy starts the new container, waits for `/up`, moves traffic and drains the old one. Measured in the rehearsal: 2,194 requests during a deploy, all 200.
- **No inbound ports but SSH.** TLS ends at Cloudflare; the tunnel is an outbound connection from the `cloudflared` accessory to Cloudflare, and kamal-proxy publishes no ports (`proxy.run.publish: false`). The firewall lets in only SSH (key only), which Kamal needs. kamal-proxy still does what it is there for (host routing, health checks, gapless deploys) but not Let's Encrypt: there is nothing to certify behind the tunnel.
- **Accessories** (not touched by `kamal deploy`): PostgreSQL 18 (Shortix, listmonk and Umami databases), Meilisearch, listmonk, Umami, `cloudflared` and `backup`. Data lives in named Docker volumes: `shortix-postgres`, `shortix-meilisearch`, `shortix-uploads` (signed license documents) and `shortix-media` (logos and other images).
- **The site reaches the CMS** at `http://shortix-cms:3000` on the Docker network, never through Cloudflare.
- **Memory** (limits in `config/deploy.yml`, about 7 GB with everything at its limit): PostgreSQL 2 GB, CMS 1.2 GB, Meilisearch 1 GB, worker 800 MB, site 600 MB, Umami 512 MB, backup 512 MB, listmonk 256 MB, cloudflared 128 MB, plus 2 GB of swap.
- **Cloudflare as code** with OpenTofu (`infra/cloudflare`): a plan shows every change before it is applied, the state is encrypted natively, and the official provider covers everything needed (zones, DNS, the tunnel and its routes, redirect rules, Access). A script against the API would have to re-implement idempotency and drift detection. OpenTofu over Terraform for its open-source licence and built-in state encryption.

What lives where:

| Path                                                    | What                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Dockerfile`, `docker/app/shortix`                      | The production image and its entry point                                        |
| `config/deploy.yml`                                     | Kamal: roles, accessories, proxy, aliases                                       |
| `.kamal/secrets.example`                                | Every secret, read from the environment (copy to `.kamal/secrets`)              |
| `bin/kamal`                                             | Kamal from its official image, pinned by digest: the same on a laptop and in CI |
| `.github/workflows/deploy.yml`                          | Build and deploy on push to `main`, when `DEPLOY_ENABLED` is `true`             |
| `infra/server/bootstrap.sh`                             | Prepares a fresh VPS (Docker, firewall, SSH, updates, swap)                     |
| `infra/server/import-catalog.sh`                        | Loads the real catalog into production                                          |
| `infra/cloudflare/`                                     | OpenTofu: zones, DNS, tunnel, redirects, Access                                 |
| `infra/backup/`                                         | The backup accessory image: `backup`, `restore`, `list-backups`                 |
| `infra/postgres`, `infra/listmonk`, `infra/meilisearch` | Scripts the accessories mount                                                   |
| `config/deploy.local.yml`, `infra/local/`               | The local deploy rehearsal                                                      |

## Secrets

Never in the repository. **GitHub Actions secrets** (environment `production`) are the source for CI; a copy of every value goes into the **password manager**, which is also where the values that never reach GitHub live (the backup private key, the OpenTofu state passphrase, the Cloudflare API token). For a deploy from a laptop, export them from a file outside any repository (`chmod 600`), e.g.:

```sh
set -a; . ~/.config/shortix/production.env; set +a     # never inside the repository
cp .kamal/secrets.example .kamal/secrets              # gitignored; it only references variables
bin/kamal deploy
```

Generate every password, secret and token with `openssl rand -hex 32` (hexadecimal, so safe inside the connection URLs).

| Secret                                                                                             | What it is                                                                                                | Comes from                                                                   |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `SHORTIX_HOST`                                                                                     | The server's IP address (kept out of the public repo: it is the origin behind Cloudflare)                 | OVHcloud                                                                     |
| `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`                                                               | CI's deploy key (ed25519, no passphrase) and the server's host key                                        | Claude generates; `ssh-keyscan`, checked against the OVHcloud console        |
| `KAMAL_REGISTRY_PASSWORD`                                                                          | GHCR: CI uses its own `GITHUB_TOKEN`; a laptop needs a classic PAT with `read:packages`, `write:packages` | GitHub (human)                                                               |
| `POSTGRES_PASSWORD`, `LISTMONK_DB_PASSWORD`, `UMAMI_DB_PASSWORD`                                   | Database users                                                                                            | generated                                                                    |
| `PAYLOAD_SECRET`                                                                                   | Payload sessions and tokens                                                                               | generated                                                                    |
| `MEILI_MASTER_KEY`                                                                                 | Meilisearch master key (the CMS uses it; the site's search-only key is derived from it)                   | generated                                                                    |
| `LISTMONK_ADMIN_PASSWORD`, `LISTMONK_API_TOKEN`                                                    | listmonk's `admin` user and the API token of `shortix-web`                                                | generated                                                                    |
| `UMAMI_APP_SECRET`, `UMAMI_ADMIN_PASSWORD`                                                         | Umami                                                                                                     | generated                                                                    |
| `SES_SMTP_USERNAME`, `SES_SMTP_PASSWORD`                                                           | Amazon SES SMTP credentials (not AWS access keys)                                                         | AWS console (human)                                                          |
| `CLOUDFLARE_TUNNEL_TOKEN`                                                                          | The tunnel's token                                                                                        | `infra/cloudflare/tofu output -raw tunnel_token`                             |
| `SENTRY_DSN`                                                                                       | Sentry project DSN (EU)                                                                                   | Sentry (human)                                                               |
| `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | Backup bucket and a key limited to it                                                                     | R2 or B2 (human)                                                             |
| `BACKUP_AGE_RECIPIENT`                                                                             | Public half of the backup key pair (`age1…`)                                                              | Claude runs `age-keygen`; the private half goes to the password manager only |
| `BACKUP_HEARTBEAT_URL`                                                                             | The uptime monitor's heartbeat for the daily backup                                                       | Better Stack (human)                                                         |
| `TF_VAR_cloudflare_api_token`, `TF_VAR_state_passphrase`                                           | OpenTofu only, never in GitHub                                                                            | Cloudflare (human); generated                                                |

## First deploy

The order matters in three places: the domains must point to Cloudflare before the tunnel serves them, SES needs its DNS records before it verifies the domain, and Cloudflare Access must protect the CMS **before** the first deploy (a CMS without users offers "create first user" to whoever arrives first; the catalog import creates the admin right after the deploy, but Access closes that window).

### A. What the human does

Accounts, purchases and anything that needs your identity or a card. Paste each value into the password manager and give it to Claude in the session (never in a chat that is public, never in the repository).

1. **OVHcloud**
   1. The domain `fenaki.tv` (if not bought yet). The redirect domains (`fenaki.es`, `fenakitv.es`, `fenakitv.com`) come later, at the launch: see [Redirect domains](#redirect-domains).
   2. VPS-2 with **Ubuntu 24.04**, in an EU data centre, with the SSH public key Claude gives you (Claude generates a dedicated key pair). Note its IP address.
   3. Zimbra Starter mailbox `hola@fenaki.tv`. Note the MX and DKIM values its control panel shows.
2. **Cloudflare** (free plan): create the account. In Zero Trust, choose a team name and the Free plan (it may ask for a card even for the free plan). Give Claude the **account ID** and an **API token** with:
   - Account: Cloudflare Tunnel Edit, Access: Apps and Policies Edit, Account Settings Read.
   - Zone (all zones of the account): Zone Edit, DNS Edit, Zone Settings Edit, Single Redirect Edit.
   - The **email addresses** that may open the CMS and listmonk's admin (Cloudflare Access).
3. **Name servers**: once Claude has created the zone, set the two Cloudflare name servers it gives you for the domain in the OVHcloud control panel (Domains → DNS servers → Modify). DNSSEC: off at OVHcloud first; Claude enables it in Cloudflare afterwards and gives you the DS record.
4. **Amazon Web Services**: account, then in **SES, region eu-west-1 (Ireland)**:
   1. Create the identity `fenaki.tv` with Easy DKIM (RSA 2048) and custom MAIL FROM `bounce.fenaki.tv`. Give Claude the three DKIM tokens.
   2. Request production access (leave the sandbox). Claude drafts the text: transactional and newsletter email with double opt-in, low volume, bounce and complaint handling by listmonk.
   3. Create **SMTP credentials** (SES → SMTP settings) and give them to Claude.
5. **Backup bucket**, one of (the provider is still open; both are configured the same way):
   - **Cloudflare R2**: bucket `shortix-backups` with **EU jurisdiction**, and an API token with Object Read & Write on that bucket only. Endpoint `https://<account-id>.eu.r2.cloudflarestorage.com`. Free up to 10 GB.
   - **Backblaze B2**: bucket in **EU Central**, private, and an application key for that bucket only. Endpoint `https://s3.eu-central-003.backblazeb2.com`; set `BACKUP_S3_PROVIDER: Other` in `config/deploy.yml`.
6. **Sentry**: account with the data region **EU** (`de.sentry.io`), free plan, one project `shortix` (platform Node.js). Give Claude its DSN.
7. **Better Stack** (uptime monitoring, EU company, free plan): account; give Claude an API token (or create the monitors listed in [Monitoring](#monitoring) by hand).
8. **GitHub**: create the environment `production` in the repository settings (optionally with yourself as required reviewer, so each deploy waits for a click). Claude sets the secrets with `gh secret set`; you can also paste them.

### B. What Claude runs

From the main checkout (where `private/` exists), with the values above in the environment.

1. **Generate the secrets** (`openssl rand -hex 32` for each generated one in the table), the deploy SSH key pair (`ssh-keygen -t ed25519 -C shortix-deploy`) and the backup key pair (`age-keygen`, from the backup image: `docker run --rm --entrypoint age-keygen ghcr.io/suvires/shortix-backup:<tag>`). The private backup key and every value go to the human for the password manager.
2. **Cloudflare**:

   ```sh
   cp infra/cloudflare/terraform.tfvars.example infra/cloudflare/terraform.tfvars   # account_id, access_emails, ovh_dkim, ses_dkim_tokens
   infra/cloudflare/tofu init
   infra/cloudflare/tofu plan -out=first.tfplan
   infra/cloudflare/tofu apply first.tfplan
   infra/cloudflare/tofu output name_servers          # → human, step A.3
   infra/cloudflare/tofu output -raw tunnel_token     # → CLOUDFLARE_TUNNEL_TOKEN
   ```

   Commit the encrypted state in the private repository (`private/infra/cloudflare.tfstate`). Run `plan`/`apply` again when the SES tokens, the OVHcloud DKIM records or the Access emails arrive.

3. **Prepare the server**, after checking its host key against the one in the OVHcloud console:

   ```sh
   ssh-keyscan -t ed25519 <ip>                              # → SSH_KNOWN_HOSTS
   ssh ubuntu@<ip> 'sh -s' < infra/server/bootstrap.sh
   ```

4. **Secrets into GitHub**: `gh secret set <NAME> --env production` for every secret in the table except the OpenTofu ones and the backup private key.
5. **First deploy**, from the laptop so every step can be watched (or Actions → Deploy → Run workflow → `setup`):

   ```sh
   bin/kamal setup              # boots kamal-proxy, the accessories and the app (landing mode)
   bin/kamal listmonk-token && bin/kamal accessory restart listmonk   # listmonk caches tokens
   bin/kamal search-key         # the site's search-only Meilisearch key
   bin/kamal setup-services     # listmonk lists, SMTP (SES), email template; Umami website and password
   SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… SHORTIX_HOST=<ip> \
     infra/server/import-catalog.sh /path/to/private/catalogo/import.json
   bin/kamal backup-now         # the first backup, and a test of the bucket and the heartbeat
   ```

6. **Check**:
   - <https://fenaki.tv/es/> shows the landing page; <https://fenaki.tv/es/cortos/…> answers 404; <https://www.fenaki.tv/x> redirects to `https://fenaki.tv/x`.
   - <https://cms.fenaki.tv/admin> asks for the Cloudflare Access code, then Payload's login.
   - Sign up for the waitlist with a real address: the confirmation email arrives (SES), its link confirms it in listmonk (<https://listas.fenaki.tv/admin>).
   - Umami (<https://stats.fenaki.tv>) shows the visit; `curl -sI https://fenaki.tv/es/` shows the security headers.
   - `bin/kamal backups` lists the first archive; the heartbeat is green in Better Stack.
   - Sentry: the project shows the deployed release once the first error arrives; `bin/kamal app exec --roles cms "printenv SENTRY_DSN"` confirms the DSN reached the containers.
7. **Turn on continuous deployment**: repository variable `DEPLOY_ENABLED` = `true`. From then on every push to `main` deploys.

## Day to day

| Task                                            | How                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploy                                          | Push to `main` (CI), or `bin/kamal deploy`                                                                                                                                                                                                                                                  |
| Roll back                                       | Actions → Deploy → Run workflow → `rollback` with the version, or `bin/kamal rollback <version>`. Versions are git commits: `bin/kamal app containers` lists the ones still kept on the server. Migrations are not reverted: roll back only to a version that works with the current schema |
| Logs                                            | `bin/kamal logs-web`, `logs-cms`, `logs-jobs`; `bin/kamal accessory logs <name>`                                                                                                                                                                                                            |
| Shell, Payload CLI                              | `bin/kamal shell`; `bin/kamal app exec --roles cms "shortix payload migrate:status"`                                                                                                                                                                                                        |
| PostgreSQL console                              | `bin/kamal psql`                                                                                                                                                                                                                                                                            |
| Change an accessory (image version, env, files) | Edit `config/deploy.yml`, then `bin/kamal accessory reboot <name>` (a few seconds of downtime for that service)                                                                                                                                                                             |
| Change the backup image (`infra/backup`)        | Push to `main` (CI builds the new tag), then `bin/kamal accessory reboot backup`                                                                                                                                                                                                            |
| Launch the catalog                              | In `config/deploy.yml`: `SITE_MODE: catalog`, `LAUNCH_DATE` (ISO 8601), `LEGAL_DRAFT: false` once a lawyer has reviewed the texts, `CONTACT_EMAIL` once the mailbox receives mail. Push to `main`                                                                                           |
| Rotate a secret                                 | Change it in GitHub and the password manager, then deploy (app secrets) or `bin/kamal accessory reboot <name>` (accessory secrets). Database passwords also need `ALTER ROLE … PASSWORD` first                                                                                              |
| A stuck deploy lock                             | `bin/kamal lock status`, `bin/kamal lock release`                                                                                                                                                                                                                                           |

Payload's jobs worker stops at once when a deploy replaces it. A job it was running stays marked as processing, which Payload would never retry, so the new worker puts such jobs back in the queue before it starts (`src/jobs/releaseInterrupted.ts`). Jobs must stay idempotent.

### Redirect domains

Other domains that only redirect to `fenaki.tv` (planned: `fenaki.es`, `fenakitv.es`, `fenakitv.com`, bought at the launch) need no server change. After buying them at OVHcloud, add them to `redirect_domains` in `infra/cloudflare/terraform.tfvars` and run `infra/cloudflare/tofu plan` and `apply`: OpenTofu creates each zone, a redirect of every URL (and its `www.`) to the same path on `fenaki.tv`, and records saying the domain sends no email. Then set the name servers from `tofu output name_servers` at OVHcloud.

## Monitoring

- **Better Stack** (free: 10 monitors, 3-minute checks, email and app alerts):
  - HTTP keyword monitor `https://fenaki.tv/es/`, keyword: the site's name (the page renders data from the CMS).
  - HTTP status monitor `https://cms.fenaki.tv/up` (Payload and PostgreSQL; kept outside Cloudflare Access).
  - HTTP status monitors `https://listas.fenaki.tv/health` and `https://stats.fenaki.tv/api/heartbeat`.
  - Heartbeat "Daily backup", period 1 day, grace 2 hours: its URL is `BACKUP_HEARTBEAT_URL`. The backup pings it on success and `…/fail` on failure.
- **Sentry**: errors from the site, the CMS server, the jobs worker and the Payload CLI, tagged with the deployed commit. Server side only, without request bodies, cookies, query strings or user data. Set an alert for new issues to email.
- **Cloudflare**: Notifications → "Tunnel health" alert (the tunnel going down means the site is down even if the server is fine).
- **The server**: `bin/kamal details` and `bin/kamal app details`; `ssh ubuntu@<ip> docker stats` for memory.

## Backups and restore

Every day at 03:30 UTC the `backup` accessory dumps every PostgreSQL database (`pg_dump`, custom format) and the roles, asks Meilisearch for a dump, and archives the uploads (documents and media). It encrypts everything with [age](https://age-encryption.org) for `BACKUP_AGE_RECIPIENT` (the server only has the public key), uploads it to the bucket as `daily/shortix-<timestamp>.tar.age`, deletes archives older than 30 days (`BACKUP_RETENTION_DAYS`) and pings the heartbeat. `bin/kamal backup-now` runs one at any time; `bin/kamal backups` lists them.

Without the private key no backup can be read: keep it in the password manager and nowhere else.

### Restore

`restore` asks for the private key (paste it; nothing is echoed or stored) and never leaves the decrypted archive behind.

**PostgreSQL** (all three databases; replaces their contents):

```sh
bin/kamal app stop
bin/kamal accessory exec backup --interactive "restore postgres latest"     # or an archive name from `bin/kamal backups`
bin/kamal accessory restart listmonk && bin/kamal accessory restart umami
bin/kamal app boot
```

**Meilisearch** (imports into a fresh database next to the current one and swaps them):

```sh
bin/kamal accessory exec backup --interactive "restore meilisearch latest"  # leaves the dump in the volume
bin/kamal accessory stop meilisearch
bin/kamal accessory exec meilisearch "sh /usr/local/bin/import-dump.sh"
bin/kamal accessory start meilisearch
```

Meilisearch is also derived data: re-importing the catalog (`infra/server/import-catalog.sh`) or editing a short re-indexes from PostgreSQL.

**Uploads** (documents and media): `bin/kamal accessory exec backup --interactive "restore uploads latest"`.

**To inspect an archive** without touching anything: `restore fetch <archive>` decrypts it into `/restore` in the backup container; delete it afterwards. Or on a laptop: download it from the bucket and `age -d -i key.txt shortix-….tar.age | tar -t`.

**A new server** (the old one is gone): order the VPS, run steps B.3 to B.5 of the first deploy up to `bin/kamal setup` (with `SHORTIX_HOST` and `SSH_KNOWN_HOSTS` updated), then restore PostgreSQL, Meilisearch and the uploads as above, and run `bin/kamal listmonk-token && bin/kamal accessory restart listmonk`. The tunnel token does not change, so Cloudflare needs nothing.

### The restore drill

Every three months, and after any change to `infra/backup`: run `bin/kamal backup-now`, then restore the latest archive in the local rehearsal (below) or into a new server, and check that the counts match (shorts, users, listmonk subscribers, Meilisearch documents, files in the uploads). Write the result in the daily log.

The drill was run in the rehearsal on 25 Oct 2026: backup, then the PostgreSQL and Meilisearch volumes and an uploaded file deleted, a fresh PostgreSQL booted, and everything restored from the bucket with the private key. Shorts, users, migrations, listmonk lists and templates, the Umami website, the Meilisearch documents and search key, and the uploaded document and media files all came back identical, and the e2e tests passed.

## Rehearsing locally

`infra/local/rehearse.sh` deploys the real `config/deploy.yml` (destination `local`, `config/deploy.local.yml`) to a stand-in server on this machine: an Ubuntu container with SSH and its own Docker. It needs only Docker, uses throwaway secrets (`.kamal/secrets.local`, gitignored), Mailpit instead of SES and `rclone serve s3` instead of the bucket. Differences: arm64 images (nested containers do not run under x86 emulation on Apple Silicon), a local registry instead of GHCR, `*.localhost` hostnames on port 8480 instead of the tunnel.

```sh
infra/local/rehearse.sh up                 # stand-in server + `kamal setup`
infra/local/rehearse.sh kamal setup-services
infra/local/rehearse.sh kamal app exec --roles cms "shortix payload run src/seed/index.ts"   # sample data
SITE_MODE=catalog infra/local/rehearse.sh kamal deploy
E2E_CATALOG_URL=http://fenaki.localhost:8480 pnpm --filter @shortix/web exec playwright test --project catalog
infra/local/rehearse.sh down               # removes everything
```

For the landing tests, deploy with the default `SITE_MODE` and run the `landing` project with `E2E_LANDING_URL=http://fenaki.localhost:8480`, `E2E_MAILPIT_URL=http://localhost:8125`, `E2E_LISTMONK_URL=http://listas.fenaki.localhost:8480` and `LISTMONK_API_TOKEN` from `.kamal/secrets.local`. Before running `setup-services` the first time, run `listmonk-token`, `accessory restart listmonk` and `search-key`, as in production.
