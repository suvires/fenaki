#!/bin/sh
# Restores Meilisearch from the dump `restore meilisearch` left in the volume. Runs in a new
# container of the Meilisearch image while the accessory is stopped (docs/deploy.md, restore):
#   kamal accessory stop meilisearch
#   kamal accessory exec meilisearch "sh /usr/local/bin/import-dump.sh"
#   kamal accessory start meilisearch
# Imports into a fresh database next to the current one and swaps them only when the import has
# finished; the previous database stays as data.ms.before-restore until you delete it.
set -eu
dump=/meili_data/restore/latest.dump
[ -f "$dump" ] || { echo "No dump at $dump: run \`restore meilisearch\` in the backup accessory first" >&2; exit 1; }

rm -rf /meili_data/data.ms.restore
meilisearch --db-path /meili_data/data.ms.restore --import-dump "$dump" \
  --http-addr 127.0.0.1:7701 --no-analytics &
pid=$!
# The server answers only once the import is complete.
until curl -sf http://127.0.0.1:7701/health >/dev/null; do
  kill -0 "$pid" 2>/dev/null || { echo "The import failed" >&2; exit 1; }
  sleep 2
done
kill "$pid"
wait "$pid" || true

rm -rf /meili_data/data.ms.before-restore
[ -d /meili_data/data.ms ] && mv /meili_data/data.ms /meili_data/data.ms.before-restore
mv /meili_data/data.ms.restore /meili_data/data.ms
rm -f "$dump"
echo "meilisearch: restored; start the accessory again"
