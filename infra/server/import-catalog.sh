#!/bin/sh
# Loads the real catalog into production: copies the import file (it never enters the repository
# or the image) into the running CMS container, runs the import there (`pnpm import:catalog`:
# idempotent, removes sample data) and deletes the copy.
#
#   FENAKI_HOST=<server ip> infra/server/import-catalog.sh <path to import.json>
#
# With SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in the environment it also creates that admin
# user if it does not exist (use a password without single quotes). FENAKI_SSH replaces the SSH
# command, e.g. for the local rehearsal.
set -eu
file=${1:?usage: import-catalog.sh <path to import.json>}
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }
ssh_cmd=${FENAKI_SSH:-ssh ubuntu@${FENAKI_HOST:?set FENAKI_HOST}}
cms='$(docker ps -q --filter label=service=fenaki --filter label=role=cms | head -n 1)'

# shellcheck disable=SC2086
$ssh_cmd "docker exec -i $cms sh -c 'cat > /tmp/import.json'" <"$file"
# shellcheck disable=SC2086
$ssh_cmd "SEED_ADMIN_EMAIL='${SEED_ADMIN_EMAIL:-}' SEED_ADMIN_PASSWORD='${SEED_ADMIN_PASSWORD:-}' \
  docker exec -e CATALOG_IMPORT_PATH=/tmp/import.json -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD $cms \
  fenaki payload run src/import/index.ts; status=\$?; docker exec $cms rm -f /tmp/import.json; exit \$status"
