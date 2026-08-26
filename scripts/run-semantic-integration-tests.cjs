'use strict';

/**
 * Cross-platform runner for semantic vector integration tests.
 * Sets REDIS_PORT / SEMANTIC_CACHE_ENABLED / EMBEDDING_BASE_URL then runs Jest.
 * (No cross-env dependency — works on Windows cmd/PowerShell and Unix.)
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

process.env.REDIS_PORT = process.env.REDIS_PORT || '6381';
process.env.SEMANTIC_CACHE_ENABLED = 'true';
process.env.EMBEDDING_BASE_URL =
  process.env.EMBEDDING_BASE_URL || 'http://127.0.0.1:9';

const result = spawnSync(
  'npx',
  [
    'jest',
    '--config',
    './test/jest-integration.json',
    '--runInBand',
    '--testPathPatterns=semantic-cache',
  ],
  {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env,
    shell: true,
  },
);

process.exit(result.status ?? 1);
