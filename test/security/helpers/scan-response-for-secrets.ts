import {
  TEST_GATEWAY_KEY,
  TEST_MASTER_KEY_REF,
  TEST_API_KEY_REF,
} from '../../../src/common/mocks/test-constants';

export type SecretScanResult = {
  findings: string[];
};

const FORBIDDEN_PATTERNS: RegExp[] = [
  /sk-ant-/i,
  /\bsk-[a-z0-9_-]{8,}/i,
  /node_modules\//i,
  /\bat\s+src\//i,
  /\bat\s+.+\.(?:ts|js):\d+/i,
  /\bError:\s+.+\n\s+at\s+/,
  /ANTHROPIC_API_KEY\s*=/i,
  /OPENAI_API_KEY\s*=/i,
  /MASTER_KEY\s*=/i,
  /\.stack\s*:/i,
];

const DEFAULT_LITERAL_SECRETS = [
  TEST_GATEWAY_KEY,
  'sk-test-api-key',
  'master-test-key',
  TEST_API_KEY_REF,
  TEST_MASTER_KEY_REF,
];

export function scanResponseForSecrets(
  payload: unknown,
  options: { extraSecrets?: string[] } = {},
): SecretScanResult {
  const serialized = JSON.stringify(payload);
  const literals = [
    ...DEFAULT_LITERAL_SECRETS,
    ...(options.extraSecrets ?? []),
  ];
  const findings: string[] = [];

  for (const secret of literals) {
    if (secret && serialized.includes(secret)) {
      findings.push(`literal:${secret}`);
    }
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(serialized)) {
      findings.push(`pattern:${pattern}`);
    }
  }

  return { findings };
}

export function scanHeadersForSecrets(
  headers: Record<string, unknown>,
  options: { extraSecrets?: string[] } = {},
): SecretScanResult {
  const serialized = JSON.stringify(headers);
  const literals = [
    ...DEFAULT_LITERAL_SECRETS,
    ...(options.extraSecrets ?? []),
  ];
  const findings: string[] = [];

  for (const secret of literals) {
    if (secret && serialized.toLowerCase().includes(secret.toLowerCase())) {
      findings.push(`header-literal:${secret}`);
    }
  }

  if (/\bsk-[a-z0-9_-]{8,}/i.test(serialized)) {
    findings.push('header-pattern:api-key');
  }

  return { findings };
}

export function expectNoSecretsDisclosed(
  payload: unknown,
  options: { extraSecrets?: string[] } = {},
): void {
  const { findings } = scanResponseForSecrets(payload, options);
  expect(findings).toEqual([]);
}

export function expectNoSecretsInHeaders(
  headers: Record<string, unknown>,
  options: { extraSecrets?: string[] } = {},
): void {
  const { findings } = scanHeadersForSecrets(headers, options);
  expect(findings).toEqual([]);
}
