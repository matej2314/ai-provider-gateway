#!/bin/bash
set -euo pipefail

cd /home/runner

if [[ ! -f .runner ]]; then
  if [[ -z "${RUNNER_TOKEN:-}" ]]; then
    echo "ERROR: RUNNER_TOKEN is required for first-time runner registration."
    echo "Generate a token: GitHub → Settings → Actions → Runners → New self-hosted runner"
    exit 1
  fi

  if [[ -z "${RUNNER_REPO_URL:-}" ]]; then
    echo "ERROR: RUNNER_REPO_URL is required (e.g. https://github.com/org/ai-provider-gateway)"
    exit 1
  fi

  ./config.sh \
    --url "${RUNNER_REPO_URL}" \
    --token "${RUNNER_TOKEN}" \
    --name "${RUNNER_NAME:-ai-gateway-runner}" \
    --work "${RUNNER_WORKDIR:-_work}" \
    --labels "${RUNNER_LABELS:-self-hosted,linux,docker}" \
    --unattended \
    --replace
fi

cleanup() {
  echo "Removing runner from GitHub..."
  ./config.sh remove --unattended --token "${RUNNER_TOKEN:-}" || true
}

if [[ "${RUNNER_EPHEMERAL:-false}" == "true" ]]; then
  trap cleanup EXIT
fi

exec ./run.sh
