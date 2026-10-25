#!/bin/sh
# One-time migration of the local development stack from the old product name (compose project
# `shortix`) to the new one (`fenaki`), keeping the data: Payload content and users, listmonk
# subscribers and lists, Umami statistics. Meilisearch is derived data and is reindexed instead.
#
#   scripts/migrate-local-to-fenaki.sh
#
# What it does, in order:
#   1. dumps the old PostgreSQL databases (shortix, listmonk, umami) to .migration-dump/;
#   2. stops the old containers (nothing is deleted: the old volumes stay as a backup);
#   3. starts the new project and restores the dumps into fresh databases;
#   4. renames what carried the old name inside the data (listmonk API user, list tags, template
#      names and subscriber attribute; the admin email `@shortix.local`; the Umami website name);
#   5. starts everything and rewrites the old names in apps/cms/.env and apps/web/.env
#      (copies are kept as .env.pre-fenaki).
#
# Safe to run again: a migrated database is recognised and left alone (FORCE=1 redoes it from the
# old volumes). Stop `pnpm dev` first. The e2e database (shortix_test) is not migrated: the tests
# create it from scratch.
#
# Overrides, for rehearsing on a disposable copy: OLD_PROJECT, NEW_PROJECT, OLD_PG_USER,
# COMPOSE_FILE (a compose file for the new project), DUMP_DIR, ENV_FILES.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
old_project=${OLD_PROJECT:-shortix}
new_project=${NEW_PROJECT:-fenaki}
old_user=${OLD_PG_USER:-shortix}
dump_dir=${DUMP_DIR:-$root/.migration-dump}
env_files=${ENV_FILES-"$root/apps/cms/.env $root/apps/web/.env"}
marker="migrated from $old_project"

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

compose() { docker compose -p "$new_project" ${COMPOSE_FILE:+-f "$COMPOSE_FILE"} "$@"; }
container() { docker ps -aq --filter "label=com.docker.compose.project=$1" --filter "label=com.docker.compose.service=$2" | head -n 1; }
# psql/pg_restore inside the new PostgreSQL container, over the local socket.
newpg() { docker exec -i "$new_pg" "$@"; }

docker info >/dev/null 2>&1 || die 'Docker is not running (on macOS with OrbStack: open -a OrbStack).'

old_pg=$(container "$old_project" postgres)
[ -n "$old_pg" ] || die "no PostgreSQL container found for the compose project '$old_project'. Nothing to migrate? Start fresh with: docker compose up -d && pnpm migrate"

# --- 1. Dump the old databases ---------------------------------------------------------------
new_pg=$(container "$new_project" postgres)
if [ -n "$new_pg" ] && [ "$(docker inspect -f '{{.State.Running}}' "$new_pg")" = true ] \
  && [ "$(newpg psql -U fenaki -d fenaki -Atc "SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname = 'fenaki'" 2>/dev/null || true)" = "$marker" ] \
  && [ -z "${FORCE:-}" ]; then
  say "Already migrated (database comment: «${marker}»). Use FORCE=1 to redo it from the old volumes."
  exit 0
fi

say "Dumping the old databases from project '$old_project'"
mkdir -p "$dump_dir"
if [ "$(docker inspect -f '{{.State.Running}}' "$old_pg")" = true ] || docker start "$old_pg" >/dev/null 2>&1; then
  until docker exec "$old_pg" pg_isready -U "$old_user" -q; do sleep 1; done
  for name in "$old_user" listmonk umami; do
    docker exec "$old_pg" pg_dump -U "$old_user" -Fc --no-owner --no-acl "$name" >"$dump_dir/$name.dump"
    [ -s "$dump_dir/$name.dump" ] || die "the dump of '$name' is empty"
    echo "  $name: $(wc -c <"$dump_dir/$name.dump" | tr -d ' ') bytes"
  done
else
  # A re-run with the new stack already using the ports: the old one cannot start, the dumps can.
  [ -s "$dump_dir/$old_user.dump" ] || die "the old PostgreSQL cannot start (ports in use?) and there are no dumps in $dump_dir"
  echo "  the old PostgreSQL cannot start; reusing the dumps in $dump_dir"
fi

# --- 2. Stop the old stack (kept, not removed) -----------------------------------------------
say "Stopping the old containers of '$old_project' (their volumes stay)"
old_ids=$(docker ps -q --filter "label=com.docker.compose.project=$old_project")
[ -z "$old_ids" ] || docker stop $old_ids >/dev/null

# --- 3. Start the new PostgreSQL and restore --------------------------------------------------
say "Starting PostgreSQL of project '$new_project'"
compose up -d --wait postgres
new_pg=$(container "$new_project" postgres)
compose run --rm postgres-init >/dev/null

existing=$(newpg psql -U fenaki -d fenaki -Atc "SELECT to_regclass('public.payload_migrations') IS NOT NULL")
if [ "$existing" = t ] && [ -z "${FORCE:-}" ]; then
  die "the new database already has data (and was not migrated by this script). Run FORCE=1 $0 to replace it with the old data."
fi

say 'Restoring the databases'
# Fresh databases: stop the listmonk/Umami containers first if a previous run left them up.
compose stop listmonk listmonk-install listmonk-config umami >/dev/null 2>&1 || true
for spec in "fenaki:fenaki:$old_user" "listmonk:listmonk:listmonk" "umami:umami:umami"; do
  db=${spec%%:*}; rest=${spec#*:}; owner=${rest%%:*}; source=${rest#*:}
  newpg psql -U fenaki -d postgres -v ON_ERROR_STOP=1 -q \
    -c "DROP DATABASE IF EXISTS $db WITH (FORCE)" -c "CREATE DATABASE $db OWNER $owner" >/dev/null
  # Connecting as the owner makes it own every restored object (the dump has no owners).
  newpg pg_restore -U "$owner" -d "$db" --no-owner --no-acl --exit-on-error <"$dump_dir/$source.dump"
  echo "  $db restored from $source.dump"
done

# --- 4. Rename what carried the old name inside the data -------------------------------------
say 'Renaming the old product name inside the data'
newpg psql -U listmonk -d listmonk -v ON_ERROR_STOP=1 -q <<'SQL'
UPDATE users SET username = 'fenaki-web' WHERE username = 'shortix-web' AND type = 'api';
UPDATE lists SET tags = array_replace(array_replace(tags, 'shortix-launch', 'fenaki-launch'), 'shortix-weekly', 'fenaki-weekly');
UPDATE templates SET name = regexp_replace(name, '^shortix-', 'fenaki-') WHERE name LIKE 'shortix-%';
UPDATE subscribers
SET attribs = (attribs - 'shortix_confirmation_sent_at')
  || jsonb_build_object('fenaki_confirmation_sent_at', attribs -> 'shortix_confirmation_sent_at')
WHERE attribs ? 'shortix_confirmation_sent_at';
SQL
newpg psql -U umami -d umami -v ON_ERROR_STOP=1 -q -c "UPDATE website SET name = 'Fenaki' WHERE lower(name) = 'shortix'"
newpg psql -U fenaki -d fenaki -v ON_ERROR_STOP=1 -q <<SQL
UPDATE users SET email = regexp_replace(email, '@shortix\.local$', '@fenaki.local') WHERE email LIKE '%@shortix.local';
COMMENT ON DATABASE fenaki IS '$marker';
SQL
left=$(newpg pg_dump -U fenaki -d fenaki --data-only | grep -ci shortix || true)
echo "  rows of the Payload database that still mention the old name: $left"
[ "$left" = 0 ] || newpg pg_dump -U fenaki -d fenaki --data-only | grep -i shortix | cut -c1-160 | head -5

# --- 5. Start everything and update the .env files --------------------------------------------
say "Starting the new stack ('$new_project')"
compose up -d --wait

for f in $env_files; do
  [ -f "$f" ] || continue
  [ -f "$f.pre-fenaki" ] || cp "$f" "$f.pre-fenaki"
  # Path-like values (CATALOG_IMPORT_PATH) keep their folder names.
  perl -pi -e 's/shortix\.film/fenaki.tv/g; s/SHORTIX/FENAKI/g; s/Shortix/Fenaki/g; s/shortix/fenaki/g unless /^\s*(#|CATALOG_IMPORT_PATH=)/' "$f"
  echo "  updated $f (copy: $f.pre-fenaki)"
done

say 'Done. Next:'
cat <<EOF
  pnpm --filter @fenaki/cms reindex     # Meilisearch starts empty: rebuild the indexes from PostgreSQL
  pnpm setup:services                   # makes sure listmonk (settings, lists, templates) and Umami are configured
  pnpm dev
The old containers are stopped, not removed. Once everything checks out, delete them and their data with:
  docker compose -p $old_project down -v
EOF
