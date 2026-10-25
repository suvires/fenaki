# A stand-in for the production VPS, to rehearse deploys locally (infra/local/rehearse.sh):
# Ubuntu 24.04 with SSH and Docker, in the state infra/server/bootstrap.sh leaves a real server.
# Runs privileged, with its own Docker daemon inside.
FROM ubuntu:24.04
RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssh-server docker.io iptables ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && usermod -aG docker ubuntu \
  && mkdir -p /run/sshd /home/ubuntu/.ssh \
  && sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
COPY --chmod=755 <<'SH' /usr/local/bin/vps
#!/bin/sh
set -e
# cgroup v2 nesting, as in the docker:dind image: move this container's processes into a child
# group so the inner Docker can delegate controllers (memory limits) to its containers.
if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
  mkdir -p /sys/fs/cgroup/init
  xargs -rn1 </sys/fs/cgroup/cgroup.procs >/sys/fs/cgroup/init/cgroup.procs 2>/dev/null || :
  sed -e 's/ / +/g' -e 's/^/+/' </sys/fs/cgroup/cgroup.controllers >/sys/fs/cgroup/cgroup.subtree_control
fi
install -m 600 -o ubuntu -g ubuntu /authorized_keys /home/ubuntu/.ssh/authorized_keys
chown ubuntu:ubuntu /home/ubuntu/.ssh
dockerd --log-level=warn >/var/log/dockerd.log 2>&1 &
exec /usr/sbin/sshd -D -e
SH
CMD ["vps"]
