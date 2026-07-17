#!/usr/bin/env bash
# Auto-rollback helper for VPS deploy (GitHub Actions).
# Assumes checkout of LAST_GOOD_SHA is already in the workspace.
# Reuses host .env (no Vault) so a Vault outage does not block recovery.
#
# Required env:
#   LAST_GOOD_SHA   Target commit (must match git HEAD)
# Optional:
#   FAILED_SHA      Failed primary deploy SHA (for logs / summary)
#   GITHUB_OUTPUT   When set, writes rolled_back / rollback_sha
#   GITHUB_STEP_SUMMARY
#   HEALTH_ATTEMPTS default 6 (override to shorten/lengthen wait)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Staging workflow sets DEPLOY_SCRIPT=deployment/scripts/deploy-staging.sh;
# default remains production for deploy.yml auto-rollback.
DEPLOY_SCRIPT="${DEPLOY_SCRIPT:-${SCRIPT_DIR}/deploy-production.sh}"

FAILED_SHA="${FAILED_SHA:-unknown}"
LAST_GOOD_SHA="${LAST_GOOD_SHA:-}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/ai-provider-gateway}"
LAST_GOOD_SHA_FILE="${LAST_GOOD_SHA_FILE:-.deployed-sha}"

write_output() {
  local key="$1" value="$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "${key}=${value}" >> "${GITHUB_OUTPUT}"
  fi
}

append_summary() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    cat >> "${GITHUB_STEP_SUMMARY}"
  fi
}

fail_rollback() {
  local msg="$1"
  echo "::error::${msg}"
  write_output rolled_back false
  {
    echo "- Result: **FAILED** - ${msg}"
  } | append_summary
  exit 1
}

echo "::warning::Primary deploy failed after host mutation - attempting auto-rollback"
{
  echo "## Auto-rollback"
  echo ""
  echo "- Primary (failed) SHA: \`${FAILED_SHA}\`"
  echo "- Last known-good SHA: \`${LAST_GOOD_SHA:-none}\`"
} | append_summary

if [[ -z "${LAST_GOOD_SHA}" ]]; then
  fail_rollback "No last known-good SHA on host - cannot auto-rollback (first deploy or missing ${DEPLOY_DIR}/${LAST_GOOD_SHA_FILE})"
fi

if [[ "${LAST_GOOD_SHA}" == "${FAILED_SHA}" ]]; then
  fail_rollback "Last known-good SHA equals failed SHA (${FAILED_SHA}) - refusing auto-rollback loop"
fi

cd "${SCRIPT_DIR}/../.."
rolled_sha="$(git rev-parse HEAD)"
if [[ "${rolled_sha}" != "${LAST_GOOD_SHA}" ]]; then
  fail_rollback "Checkout mismatch: expected ${LAST_GOOD_SHA}, got ${rolled_sha}"
fi

echo "============================================================"
echo " AUTO-ROLLBACK"
echo " Failed SHA : ${FAILED_SHA}"
echo " Target SHA : ${LAST_GOOD_SHA}"
echo "============================================================"

# Prefer host .env from the last (partial) deploy / previous good secrets.
# Avoid re-fetching Vault so Vault downtime does not block recovery.
export SKIP_VAULT_FETCH=true
export DEPLOY_MODE="${DEPLOY_MODE:-production}"

echo "Rollback deploy script: ${DEPLOY_SCRIPT} (DEPLOY_MODE=${DEPLOY_MODE})"

if ! bash "${DEPLOY_SCRIPT}" all; then
  fail_rollback "Auto-rollback deploy/health FAILED for ${LAST_GOOD_SHA}"
fi

write_output rolled_back true
write_output rollback_sha "${LAST_GOOD_SHA}"
echo "::warning::Auto-rollback SUCCEEDED -> ${LAST_GOOD_SHA} (primary deploy ${FAILED_SHA} failed)"
{
  echo "- Result: **SUCCEEDED** - ${DEPLOY_MODE} restored to \`${LAST_GOOD_SHA}\`"
  echo "- Workflow will still fail so the bad release is visible in Actions history"
} | append_summary
