#!/bin/sh
# Rehearses a production deploy on this machine, with the real config/deploy.yml (destination
# `local`, config/deploy.local.yml) against a stand-in VPS: an Ubuntu container with SSH and its
# own Docker daemon. Needs only Docker; Kamal runs from its official image.
#
#   infra/local/rehearse.sh up              start the stand-in and run `kamal setup`
#   infra/local/rehearse.sh kamal <args>    any Kamal command, e.g. `kamal deploy`, `kamal app logs`
#   infra/local/rehearse.sh backup-image    rebuild the backup accessory from infra/backup
#   infra/local/rehearse.sh ssh [command]   a shell on the stand-in
#   infra/local/rehearse.sh down            remove the stand-in and everything in it
#
# The site answers at http://shortix.localhost:8480, the CMS at http://cms.shortix.localhost:8480
# and Mailpit at http://localhost:8125. SITE_MODE=catalog in the environment deploys the catalog.
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)
state="$root/infra/local/.state"
vps=shortix-rehearsal-vps
kamal_image=ghcr.io/basecamp/kamal:v2.12.0

key="$state/id_ed25519"
ssh_opts="-i $key -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR"

kamal() {
  # The working tree and the repository's git directory (a worktree points outside it) at the
  # same paths, and the host's Docker for building and for the local registry.
  common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir)
  docker run --rm --network host \
    -v "$root:$root" -v "$common:$common" -w "$root" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e KAMAL_REHEARSAL=1 -e SHORTIX_HOST=127.0.0.1 -e REHEARSAL_SSH_KEY="$key" -e SITE_MODE="${SITE_MODE:-landing}" \
    "$kamal_image" "$@" -d local
}

# The backup image Kamal would pull from GHCR is loaded straight into the stand-in.
load_backup_image() {
  docker save shortix-backup:rehearsal | docker exec -i "$vps" docker load -q
}

secrets() {
  [ -f "$root/.kamal/secrets.local" ] && return
  # Throwaway values for the rehearsal only, in the same shape as .kamal/secrets.example.
  r() { openssl rand -hex 24; }
  age_key=$(docker run --rm --entrypoint age-keygen shortix-backup:rehearsal 2>/dev/null)
  echo "$age_key" >"$state/backup-age-identity.txt"
  cat >"$root/.kamal/secrets.local" <<EOF
KAMAL_REGISTRY_PASSWORD=unused
POSTGRES_PASSWORD=$(r)
LISTMONK_DB_PASSWORD=$(r)
UMAMI_DB_PASSWORD=$(r)
DATABASE_URL=postgres://shortix:\${POSTGRES_PASSWORD}@shortix-postgres:5432/shortix
UMAMI_DATABASE_URL=postgresql://umami:\${UMAMI_DB_PASSWORD}@shortix-postgres:5432/umami
PAYLOAD_SECRET=$(r)
MEILI_MASTER_KEY=$(r)
MEILI_SEARCH_KEY_UID=8a1c2e9e-3c51-4f3b-9d6e-5b1d1c0f7a42
MEILISEARCH_SEARCH_KEY=\$(ruby -ropenssl -e 'print OpenSSL::HMAC.hexdigest("SHA256", ARGV[0], ARGV[1])' "\$MEILI_MASTER_KEY" "\$MEILI_SEARCH_KEY_UID")
LISTMONK_ADMIN_PASSWORD=$(r)
LISTMONK_API_TOKEN=$(r)
UMAMI_APP_SECRET=$(r)
UMAMI_ADMIN_PASSWORD=$(r)
SES_SMTP_USERNAME=
SES_SMTP_PASSWORD=
CLOUDFLARE_TUNNEL_TOKEN=unused
SENTRY_DSN=
BACKUP_S3_ENDPOINT=http://shortix-s3:8080
BACKUP_S3_BUCKET=shortix-backups
BACKUP_S3_ACCESS_KEY_ID=rehearsal
BACKUP_S3_SECRET_ACCESS_KEY=rehearsal-secret
BACKUP_AGE_RECIPIENT=$(echo "$age_key" | sed -n 's/^# public key: //p')
BACKUP_HEARTBEAT_URL=
EOF
}

case "${1:-}" in
  up)
    mkdir -p "$state"
    [ -f "$key" ] || ssh-keygen -q -t ed25519 -N '' -C shortix-rehearsal -f "$key"
    docker build -q -t shortix-rehearsal-vps:local -f "$root/infra/local/vps.Dockerfile" "$root/infra/local" >/dev/null
    docker build -q -t shortix-backup:rehearsal "$root/infra/backup" >/dev/null
    if ! docker inspect "$vps" >/dev/null 2>&1; then
      docker run -d --name "$vps" --privileged \
        -p 127.0.0.1:2222:22 -p 127.0.0.1:8480:80 -p 127.0.0.1:8125:8025 \
        -v "$key.pub:/authorized_keys:ro" -v shortix-rehearsal-docker:/var/lib/docker \
        shortix-rehearsal-vps:local >/dev/null
      until docker exec "$vps" docker info >/dev/null 2>&1; do sleep 1; done
    fi
    load_backup_image
    secrets
    kamal setup
    ;;
  backup-image)
    docker build -q -t shortix-backup:rehearsal "$root/infra/backup" >/dev/null
    # `accessory remove` deletes the image too, so it is loaded again before booting.
    kamal accessory remove backup -y
    load_backup_image
    kamal accessory boot backup
    ;;
  kamal)
    shift
    kamal "$@"
    ;;
  ssh)
    shift
    # shellcheck disable=SC2086
    exec ssh $ssh_opts ubuntu@127.0.0.1 "$@"
    ;;
  down)
    docker rm -f "$vps" >/dev/null 2>&1 || true
    docker volume rm shortix-rehearsal-docker >/dev/null 2>&1 || true
    docker rm -f kamal-docker-registry >/dev/null 2>&1 || true
    rm -f "$root/.kamal/secrets.local"
    rm -rf "$state"
    ;;
  *)
    sed -n '2,13p' "$0"
    exit 2
    ;;
esac
