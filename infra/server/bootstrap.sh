#!/bin/sh
# Prepares a fresh OVHcloud VPS (Ubuntu 24.04) for Kamal, from your machine. Run once, before the
# first `bin/kamal setup`, while you can still log in as `ubuntu` with the key you gave OVHcloud:
#
#   infra/server/bootstrap.sh <server ip> <your public key file> <CI deploy public key file>
#
# BOOTSTRAP_SSH_OPTS adds options to ssh and scp (e.g. -o Port=2223 for a local test).
# Your key: Ed25519, or RSA of at least 3072 bits. The CI deploy key: Ed25519. They are passed to the server here and never stored in the repository.
# Copies sshd.conf and bootstrap-remote.sh to the server and runs it (docs/deploy.md), then checks
# that you can still log in. Idempotent: run it again to change a key.
set -eu
host=${1:?usage: bootstrap.sh <server ip> <your public key file> <CI deploy public key file>}
human_file=${2:?your public key file, e.g. ~/.ssh/id_ed25519.pub or ~/.ssh/id_rsa.pub}
deploy_file=${3:?the CI deploy public key file}
here=$(cd "$(dirname "$0")" && pwd)

# The key line of a public key file, if its type is allowed: `ed25519`, or `rsa` too.
key() {
  info=$(ssh-keygen -l -f "$1" 2>/dev/null) || { echo "Not a public key: $1" >&2; exit 1; }
  bits=${info%% *}
  read -r type rest <"$1"
  case $type in
    ssh-ed25519 | sk-ssh-ed25519@openssh.com) ;;
    ssh-rsa)
      [ "$2" = rsa ] || { echo "$1 is RSA: the CI deploy key must be Ed25519 (ssh-keygen -t ed25519)" >&2; exit 1; }
      [ "$bits" -ge 3072 ] || { echo "$1 is a $bits-bit RSA key: RSA keys need at least 3072 bits (ssh-keygen -t ed25519, or -t rsa -b 4096)" >&2; exit 1; }
      ;;
    *) echo "$1 is $type: use an Ed25519 key (ssh-keygen -t ed25519) or RSA of at least 3072 bits" >&2; exit 1 ;;
  esac
  printf '%s %s' "$type" "$rest"
}
human_key=$(key "$human_file" rsa)
deploy_key=$(key "$deploy_file" ed25519)

target="ubuntu@$host"
opts=${BOOTSTRAP_SSH_OPTS:-}
# shellcheck disable=SC2086
ssh $opts "$target" 'mkdir -p /tmp/shortix-bootstrap'
# shellcheck disable=SC2086
scp -q $opts "$here/bootstrap-remote.sh" "$here/sshd.conf" "$target:/tmp/shortix-bootstrap/"
# shellcheck disable=SC2086
ssh $opts "$target" "sh /tmp/shortix-bootstrap/bootstrap-remote.sh '$human_key' '$deploy_key' && rm -rf /tmp/shortix-bootstrap"

# A new connection, with the new configuration: if this fails, keep the session you have open
# elsewhere, or use the OVHcloud rescue mode (docs/deploy.md, "Break glass").
# shellcheck disable=SC2086
if ssh $opts -o ConnectTimeout=10 "$target" true; then
  echo "bootstrap: done; you can log in. Log out and back in for the docker group to apply."
else
  echo "bootstrap: could not log in again: see docs/deploy.md, \"Break glass\"" >&2
  exit 1
fi
