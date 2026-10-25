#!/bin/sh
# Prepares a fresh OVHcloud VPS (Ubuntu 24.04) for Kamal. Run once, as the `ubuntu` user OVHcloud
# creates with your SSH key, before the first `bin/kamal setup`:
#
#   ssh ubuntu@<server> 'sh -s' < infra/server/bootstrap.sh
#
# Idempotent. Leaves: Docker, with `ubuntu` in the docker group (Kamal's SSH user); a firewall
# that only lets SSH in (the web arrives through the Cloudflare Tunnel, an outbound connection);
# SSH by key only; automatic security updates with a reboot window after the nightly backup; UTC;
# and 2 GB of swap as a cushion for memory peaks.
set -eu
sudo() { if [ "$(id -u)" -eq 0 ]; then "$@"; else command sudo "$@"; fi; }
log() { echo "bootstrap: $*"; }

log "packages"
sudo apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -q
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q docker.io ufw unattended-upgrades curl

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

log "ssh: keys only, no root"
sudo tee /etc/ssh/sshd_config.d/90-shortix.conf >/dev/null <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
CONF
sudo systemctl reload ssh

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
