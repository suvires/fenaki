#!/bin/sh
# Builds the site once and serves it twice for the e2e tests: the catalog on 4400 and the landing
# page on 4401 (or CATALOG_PORT and LANDING_PORT). Every setting is read at start, so both run the
# same build; apps/web/.env fills in the rest (the listmonk token), without overriding what is set
# here.
set -e
# Built for an https address, as in production: Astro trusts the proxy's X-Forwarded-* headers for it
# only (the account e2e test posts the sign-out form as if from behind the proxy).
SITE_URL=https://fenaki.test pnpm --filter @fenaki/web build >/dev/null
CATALOG_PORT=${CATALOG_PORT:-4400}
LANDING_PORT=${LANDING_PORT:-4401}
SITE_MODE=landing LEGAL_DRAFT=false SITE_URL=http://localhost:$LANDING_PORT CONTACT_EMAIL=hola@fenaki.tv PORT=$LANDING_PORT node --env-file-if-exists=.env dist/server/entry.mjs &
SITE_MODE=catalog LEGAL_DRAFT=false SITE_URL=http://localhost:$CATALOG_PORT CONTACT_EMAIL= PORT=$CATALOG_PORT exec node --env-file-if-exists=.env dist/server/entry.mjs
