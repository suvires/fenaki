#!/bin/sh
# Builds the site once and serves it twice for the e2e tests: the catalog on 4400 and the landing
# page on 4401. Every setting is read at start, so both run the same build; apps/web/.env fills
# in the rest (the listmonk token), without overriding what is set here.
set -e
pnpm --filter @shortix/web build >/dev/null
SITE_MODE=landing SITE_URL=http://localhost:4401 PORT=4401 node --env-file-if-exists=.env dist/server/entry.mjs &
SITE_MODE=catalog SITE_URL=http://localhost:4400 PORT=4400 exec node --env-file-if-exists=.env dist/server/entry.mjs
