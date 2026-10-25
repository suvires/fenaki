#!/bin/sh
# Loads the sales CRM's organizations into production: copies the CSV (it never enters the
# repository or the image) into the running CMS container, runs `import:organizations` there
# (idempotent: it never overwrites what has been worked on) and deletes the copy.
#
#   FENAKI_HOST=<server ip> infra/server/import-organizations.sh <path to organizaciones.csv>
#
# FENAKI_SSH replaces the SSH command, e.g. for the local rehearsal.
set -eu
file=${1:?usage: import-organizations.sh <path to the CSV>}
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }
ssh_cmd=${FENAKI_SSH:-ssh ubuntu@${FENAKI_HOST:?set FENAKI_HOST}}
cms='$(docker ps -q --filter label=service=fenaki --filter label=role=cms | head -n 1)'

# shellcheck disable=SC2086
$ssh_cmd "docker exec -i $cms sh -c 'cat > /tmp/organizations.csv'" <"$file"
# shellcheck disable=SC2086
$ssh_cmd "docker exec -e CRM_IMPORT_PATH=/tmp/organizations.csv $cms \
  fenaki payload run src/import/organizations.ts; status=\$?; docker exec $cms rm -f /tmp/organizations.csv; exit \$status"
