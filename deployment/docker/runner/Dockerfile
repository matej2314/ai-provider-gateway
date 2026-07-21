# Self-hosted GitHub Actions runner for VPS deploy.
# Build: docker compose -f deployment/docker/runner/docker-compose.yml build
FROM ghcr.io/actions/actions-runner:2.321.0

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    jq \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    docker-ce-cli \
    docker-compose-plugin \
    nodejs \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER runner

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
