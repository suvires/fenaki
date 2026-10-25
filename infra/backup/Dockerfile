# Backup accessory: daily encrypted dumps of PostgreSQL, Meilisearch and the uploads to
# S3-compatible storage (Cloudflare R2 or Backblaze B2). Same PostgreSQL major version as the
# `postgres` accessory, so pg_dump and pg_restore match the server.
FROM postgres:18.6-alpine3.24
RUN apk add --no-cache rclone age curl jq tzdata
COPY bin/ /usr/local/bin/
ENTRYPOINT []
CMD ["backup-scheduler"]
