#!/bin/sh
# Gives listmonk's API user `shortix-web` the token in LISTMONK_API_TOKEN, as the site and the CMS
# expect (listmonk stores its SHA-256). Runs in the `postgres` accessory after listmonk has
# installed itself:  kamal listmonk-token
set -eu

updated=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname listmonk -qtA \
  -v token="$LISTMONK_API_TOKEN" <<'SQL'
UPDATE users SET password = encode(sha256(convert_to(:'token', 'UTF8')), 'hex')
WHERE username = 'shortix-web' AND type = 'api'
RETURNING username;
SQL
)
if [ "$updated" != "shortix-web" ]; then
  echo "listmonk has no API user shortix-web yet: is the listmonk accessory running?" >&2
  exit 1
fi
echo "listmonk: API token of shortix-web set"
