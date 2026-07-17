#!/usr/bin/env bash
# Staging deploy: gateway + monitoring (no Redis), same DooD/host sync path as production.
#
# Usage: deploy-staging.sh [sync|secrets|up|health|all]
# Default action: all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DEPLOY_MODE=staging

exec bash "${SCRIPT_DIR}/deploy-production.sh" "${1:-all}"
