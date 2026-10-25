#!/bin/sh
# First start of the production PostgreSQL (the Kamal `postgres` accessory) only: the official
# image runs this when the data directory is empty. Creates the listmonk and Umami roles and
# databases next to Shortix's own, with passwords from the accessory's secrets.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v listmonk_password="$LISTMONK_DB_PASSWORD" -v umami_password="$UMAMI_DB_PASSWORD" <<'SQL'
CREATE ROLE listmonk LOGIN PASSWORD :'listmonk_password';
CREATE DATABASE listmonk OWNER listmonk;
CREATE ROLE umami LOGIN PASSWORD :'umami_password';
CREATE DATABASE umami OWNER umami;
SQL
