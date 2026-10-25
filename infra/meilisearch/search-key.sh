#!/bin/sh
# Creates the search-only API key the site uses, with the fixed uid MEILI_SEARCH_KEY_UID.
# Meilisearch derives a key from its uid and the master key (HMAC-SHA256), so .kamal/secrets
# computes the same MEILISEARCH_SEARCH_KEY without reading it back. Idempotent.
#   kamal search-key
set -eu
host=http://localhost:7700
auth="Authorization: Bearer $MEILI_MASTER_KEY"

if curl -sf -H "$auth" "$host/keys/$MEILI_SEARCH_KEY_UID" >/dev/null; then
  echo "meilisearch: search key exists"
  exit 0
fi
curl -sf -X POST "$host/keys" -H "$auth" -H 'Content-Type: application/json' \
  --data "{\"uid\":\"$MEILI_SEARCH_KEY_UID\",\"name\":\"shortix-web-search\",\"description\":\"Search only, for the site\",\"actions\":[\"search\"],\"indexes\":[\"*\"],\"expiresAt\":null}" \
  >/dev/null
echo "meilisearch: search key created"
