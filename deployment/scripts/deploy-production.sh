#!/usr/bin/env bash
# Production (and shared) deploy helpers for self-hosted VPS / DooD.
# Used by .github/workflows/deploy.yml, deploy_staging.yml (via deploy-staging.sh), and rollback.sh.
#
# Usage:
#   deploy-production.sh sync|secrets|up|health|all
#
# Env (common):
#   DEPLOY_DIR              Host path bind-mounted by Docker daemon (default: /opt/ai-provider-gateway)
#   LAST_GOOD_SHA_FILE      Relative name under DEPLOY_DIR (default: .deployed-sha)
#   COMPOSE_PROJECT         docker compose -p name (default: ai-provider-gateway)
#   DEPLOY_MODE             production|staging (default: production)
#   SKIP_VAULT_FETCH        true = reuse host .env (rollback); false = fetch from Vault
#   HEALTH_URL              default: http://ai-gateway:3000/api/v1/health/ready
#   HEALTH_ATTEMPTS         default: 6 (5s each)
#   VAULT_* / CONT_NAME     Vault AppRole + KV path (secrets step)

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/ai-provider-gateway}"
LAST_GOOD_SHA_FILE="${LAST_GOOD_SHA_FILE:-.deployed-sha}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-ai-provider-gateway}"
DEPLOY_MODE="${DEPLOY_MODE:-production}"
SKIP_VAULT_FETCH="${SKIP_VAULT_FETCH:-false}"
HEALTH_URL="${HEALTH_URL:-http://ai-gateway:3000/api/v1/health/ready}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-6}"
CONT_NAME="${CONT_NAME:-ai-provider-gateway}"
VAULT_ADDR="${VAULT_ADDR:-https://vault-prod:8200}"
VAULT_SKIP_VERIFY="${VAULT_SKIP_VERIFY:-true}"
VAULT_ENV="${VAULT_ENV:-prod}"

OVERLAY_BINDS="${OVERLAY_BINDS:-/tmp/deploy-host-binds.yml}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

cmd_usage() {
  echo "Usage: $0 sync|secrets|up|health|all" >&2
  exit 2
}

vault_curl() {
  if [[ "${VAULT_SKIP_VERIFY}" == "true" ]]; then
    curl -k "$@"
  else
    curl "$@"
  fi
}

write_overlays() {
  printf '%s\n' \
    'services:' \
    '  gateway:' \
    '    volumes:' \
    "      - ${DEPLOY_DIR}/gateway.config.yaml:/app/gateway.config.yaml:ro" \
    "      - ${DEPLOY_DIR}/logs:/app/logs" \
    '  prometheus:' \
    '    volumes:' \
    "      - ${DEPLOY_DIR}/deployment/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
    "      - ${DEPLOY_DIR}/deployment/monitoring/alerts.yml:/etc/prometheus/alerts.yml:ro" \
    '  grafana:' \
    '    volumes:' \
    "      - ${DEPLOY_DIR}/deployment/monitoring/grafana/provisioning:/etc/grafana/provisioning:ro" \
    "      - ${DEPLOY_DIR}/deployment/monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro" \
    > "${OVERLAY_BINDS}"
}

compose_files() {
  local files=(
    -f deployment/docker/docker-compose.yml
  )
  if [[ "${DEPLOY_MODE}" == "production" ]]; then
    files+=(-f deployment/docker/docker-compose.redis.yml)
    files+=(-f deployment/docker/docker-compose.ollama-embedding.yml)
  fi
  files+=(
    -f deployment/docker/docker-compose.monitoring.yml
    -f "${OVERLAY_BINDS}"
  )
  printf '%s\n' "${files[@]}"
}

compose() {
  # shellcheck disable=SC2046
  docker compose -p "${COMPOSE_PROJECT}" --env-file .env $(compose_files) "$@"
}

verify_host_bind_sources() {
  local label="${1:-}"
  docker run --rm \
    -e "DEPLOY_DIR=${DEPLOY_DIR}" \
    -e "VERIFY_LABEL=${label}" \
    -v "${DEPLOY_DIR}:/dest:ro" \
    alpine:3.20 \
    sh -c '
      set -euo pipefail
      for rel in gateway.config.yaml deployment/monitoring/prometheus.yml deployment/monitoring/alerts.yml; do
        if [ ! -f "/dest/$rel" ]; then
          if [ -n "${VERIFY_LABEL}" ]; then
            echo "FATAL: expected regular file on Docker host: $DEPLOY_DIR/$rel (${VERIFY_LABEL})"
          else
            echo "FATAL: expected regular file on Docker host: $DEPLOY_DIR/$rel"
          fi
          ls -la /dest | head -50 || true
          ls -la "$(dirname "/dest/$rel")" || true
          exit 1
        fi
        echo "OK host bind source: $rel ($(wc -c < "/dest/$rel" | tr -d " ") bytes)"
      done
    '
}

cmd_sync() {
  # Self-hosted runner often uses docker.sock from a container (DooD):
  # daemon bind-mounts the *host* DEPLOY_DIR; stream checkout via tar stdin.
  docker stop ai-gateway ai-gateway-prometheus ai-gateway-grafana 2>/dev/null || true
  docker rm -f ai-gateway ai-gateway-prometheus ai-gateway-grafana 2>/dev/null || true

  docker run --rm \
    -e "DEPLOY_DIR=${DEPLOY_DIR}" \
    -e "LAST_GOOD_SHA_FILE=${LAST_GOOD_SHA_FILE}" \
    -v "${DEPLOY_DIR}:/dest" \
    alpine:3.20 \
    sh -c '
      set -euo pipefail
      for rel in gateway.config.yaml deployment/monitoring/prometheus.yml deployment/monitoring/alerts.yml; do
        if [ -d "/dest/$rel" ]; then
          echo "Removing Docker junk directory on host: $rel"
          rm -rf "/dest/$rel"
        fi
      done
      if [ -f /dest/.env ]; then cp -a /dest/.env /tmp/.env.bak; fi
      if [ -f "/dest/$LAST_GOOD_SHA_FILE" ]; then
        cp -a "/dest/$LAST_GOOD_SHA_FILE" /tmp/.deployed-sha.bak
      fi
      find /dest -mindepth 1 -maxdepth 1 \
        ! -name .env \
        ! -name "$LAST_GOOD_SHA_FILE" \
        -exec rm -rf {} +
      if [ -f /tmp/.env.bak ]; then mv /tmp/.env.bak /dest/.env; fi
      if [ -f /tmp/.deployed-sha.bak ]; then
        mv /tmp/.deployed-sha.bak "/dest/$LAST_GOOD_SHA_FILE"
      fi
      mkdir -p /dest/logs
    '

  echo "Streaming checkout -> host ${DEPLOY_DIR} ..."
  tar -C "${PWD}" --exclude=.git --exclude=.env --exclude="${LAST_GOOD_SHA_FILE}" -cf - . \
    | docker run --rm -i -v "${DEPLOY_DIR}:/dest" alpine:3.20 \
      tar -C /dest -xf -

  verify_host_bind_sources
}

pull_host_env_to_workspace() {
  if docker run --rm -v "${DEPLOY_DIR}:/dest:ro" alpine:3.20 \
    sh -c 'test -f /dest/.env'; then
    docker run --rm -v "${DEPLOY_DIR}:/dest:ro" alpine:3.20 \
      sh -c 'cat /dest/.env' > .env
    chmod 600 .env
    echo "Loaded workspace .env from host ${DEPLOY_DIR}/.env"
    return 0
  fi
  return 1
}

push_workspace_env_to_host() {
  docker run --rm -i \
    -v "${DEPLOY_DIR}:/dest" \
    alpine:3.20 \
    sh -c 'cat > /dest/.env && chmod 600 /dest/.env && echo "Synced .env to host deploy dir"' \
    < .env
}

cmd_secrets() {
  if [[ "${SKIP_VAULT_FETCH}" == "true" ]]; then
    if pull_host_env_to_workspace; then
      echo "SKIP_VAULT_FETCH=true - reusing host .env (no Vault call)"
      return 0
    fi
    echo "SKIP_VAULT_FETCH=true but host .env missing - falling back to Vault"
  fi

  if [[ -z "${VAULT_ROLE_ID:-}" || -z "${VAULT_SECRET_ID:-}" ]]; then
    echo "ERROR: VAULT_ROLE_ID and VAULT_SECRET_ID must be set" >&2
    exit 1
  fi

  local login_response vault_token secrets_response secret_count
  login_response=$(vault_curl -s --request POST \
    --data "{\"role_id\":\"${VAULT_ROLE_ID}\",\"secret_id\":\"${VAULT_SECRET_ID}\"}" \
    "${VAULT_ADDR}/v1/auth/approle/login")

  vault_token=$(echo "${login_response}" | jq -r '.auth.client_token // empty')
  if [[ -z "${vault_token}" ]]; then
    echo "Failed to authenticate with Vault"
    echo "${login_response}"
    exit 1
  fi

  secrets_response=$(vault_curl -s -H "X-Vault-Token: ${vault_token}" \
    "${VAULT_ADDR}/v1/secret/data/${CONT_NAME}/${VAULT_ENV}")

  if ! echo "${secrets_response}" | jq -e '.data.data' >/dev/null; then
    echo "No secrets at secret/data/${CONT_NAME}/${VAULT_ENV}"
    echo "${secrets_response}"
    exit 1
  fi

  echo "${secrets_response}" | jq -r '.data.data | to_entries[] | "\(.key)=\(.value)"' > .env
  chmod 600 .env
  secret_count=$(wc -l < .env | tr -d ' ')
  echo "Created workspace .env with ${secret_count} entries"
  push_workspace_env_to_host
}

cmd_up() {
  if [[ ! -f .env ]]; then
    echo "ERROR: workspace .env missing - run secrets first or copy from host" >&2
    exit 1
  fi

  docker network create ai-gateway-network 2>/dev/null || true
  write_overlays
  verify_host_bind_sources "before up"

  echo "Building gateway (${DEPLOY_MODE}) ..."
  compose build gateway

  echo "Starting stack (${DEPLOY_MODE}) ..."
  compose up -d --force-recreate --pull always
}

cmd_health() {
  echo "Waiting for gateway readiness at ${HEALTH_URL} ..."
  local ready=false i body
  for i in $(seq 1 "${HEALTH_ATTEMPTS}"); do
    if body=$(curl -sf "${HEALTH_URL}"); then
      echo "${body}" | jq .
      if echo "${body}" | jq -e '.status == "ready"' >/dev/null; then
        ready=true
        break
      fi
    fi
    sleep 5
  done

  if [[ "${ready}" != "true" ]]; then
    echo "Readiness check failed"
    compose logs --tail=100 gateway || true
    exit 1
  fi
  echo "Health check OK"
}

cmd_all() {
  cmd_sync
  cmd_secrets
  cmd_up
  cmd_health
}

main() {
  local action="${1:-}"
  case "${action}" in
    sync) cmd_sync ;;
    secrets) cmd_secrets ;;
    up) cmd_up ;;
    health) cmd_health ;;
    all) cmd_all ;;
    *) cmd_usage ;;
  esac
}

main "$@"
