#!/bin/sh
# Runs on the server, started by infra/server/bootstrap.sh (which copies it with sshd.conf):
#
#   sh bootstrap-remote.sh '<your public key>' '<CI deploy public key>'
#
# Idempotent. Leaves: Docker, with `ubuntu` in the docker group (Kamal's SSH user); a firewall
# that only lets SSH in (the web arrives through the Cloudflare Tunnel, an outbound connection);
# SSH hardened (sshd.conf) for `ubuntu` with exactly the two given keys; fail2ban banning
# addresses that fail to log in; automatic security updates with a reboot window after the
# nightly backup; UTC; and 2 GB of swap as a cushion for memory peaks.
set -eu
human_key=${1:?your public key}
deploy_key=${2:?the CI deploy public key}
here=$(cd "$(dirname "$0")" && pwd)
sudo() { if [ "$(id -u)" -eq 0 ]; then "$@"; else command sudo "$@"; fi; }
log() { echo "bootstrap: $*"; }

log "packages"
sudo apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -q
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q docker.io ufw fail2ban nftables unattended-upgrades curl

log "docker"
sudo install -d /etc/docker
# Containers keep running while the Docker daemon itself is upgraded.
echo '{ "live-restore": true }' | sudo tee /etc/docker/daemon.json >/dev/null
sudo systemctl enable --now docker
sudo systemctl restart docker
sudo usermod -aG docker ubuntu

log "firewall: SSH only"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw --force enable

log "ssh: public keys only, user ubuntu, modern algorithms"
# bootstrap.sh has checked the keys (RSA under 3072 bits is refused; sshd enforces it too).
case $human_key in
  ssh-ed25519\ * | sk-ssh-ed25519@openssh.com\ * | ssh-rsa\ *) ;;
  *) echo "bootstrap: your key must be Ed25519 or RSA: $human_key" >&2; exit 1 ;;
esac
case $deploy_key in
  ssh-ed25519\ * | sk-ssh-ed25519@openssh.com\ *) ;;
  *) echo "bootstrap: the CI deploy key must be Ed25519: $deploy_key" >&2; exit 1 ;;
esac
# Exactly these two keys: yours, for interactive access, and the one GitHub Actions deploys with.
install -d -m 700 /home/ubuntu/.ssh
printf '%s\n%s\n' "$human_key" "$deploy_key" >/home/ubuntu/.ssh/authorized_keys.new
chmod 600 /home/ubuntu/.ssh/authorized_keys.new
mv /home/ubuntu/.ssh/authorized_keys.new /home/ubuntu/.ssh/authorized_keys
sudo install -m 644 "$here/sshd.conf" /etc/ssh/sshd_config.d/90-shortix.conf
sudo sshd -t
# Open sessions survive the restart.
sudo systemctl restart ssh

log "fail2ban: ban addresses that keep failing to log in"
sudo tee /etc/fail2ban/jail.d/shortix.conf >/dev/null <<'CONF'
[sshd]
enabled = true
backend = systemd
# Also counts failed public keys and closed pre-authentication connections: with passwords off,
# that is what brute force looks like.
mode = aggressive
maxretry = 5
findtime = 10m
bantime = 1h
bantime.increment = true
bantime.maxtime = 1w
CONF
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

log "automatic security updates, rebooting at 04:30 UTC when needed"
sudo tee /etc/apt/apt.conf.d/52shortix-unattended >/dev/null <<'CONF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
CONF
sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

log "time zone UTC"
sudo timedatectl set-timezone Etc/UTC

if [ ! -f /swapfile ]; then
  log "swap: 2 GB"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/90-shortix.conf >/dev/null
  sudo sysctl -q -p /etc/sysctl.d/90-shortix.conf
fi

log "done. Log out and back in for the docker group to apply."
