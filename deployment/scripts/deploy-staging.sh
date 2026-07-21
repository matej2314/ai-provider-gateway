#!/usr/bin/env bash
# Staging deploy: gateway + monitoring (no Redis), same DooD/host sync path as production.
# Used by .github/workflows/deploy_staging.yml (developer branch only).
#
# Usage: deploy-staging.sh [sync|secrets|up|health|all]
# Default action: all
#
# Defaults (overridable by caller / Actions env):
#   DEPLOY_MODE=staging
#   VAULT_ENV=staging
#   DEPLOY_DIR=/opt/ai-provider-gateway-staging

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export DEPLOY_MODE=staging
export VAULT_ENV="${VAULT_ENV:-staging}"
export DEPLOY_DIR="${DEPLOY_DIR:-/opt/ai-provider-gateway-staging}"

exec bash "${SCRIPT_DIR}/deploy-production.sh" "${1:-all}"
