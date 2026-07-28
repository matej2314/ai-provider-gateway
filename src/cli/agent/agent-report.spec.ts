import { exitCodeForReport, type AgentReport } from './agent-report';

function report(
  partial: Pick<AgentReport, 'ok' | 'status'> &
    Partial<Omit<AgentReport, 'ok' | 'status'>>,
): AgentReport {
  return {
    command: 'test',
    ...partial,
  };
}

describe('exitCodeForReport', () => {
  it('returns 0 for success', () => {
    expect(exitCodeForReport(report({ ok: true, status: 'success' }))).toBe(0);
  });

  it('returns 2 for awaiting_secrets even when ok is false', () => {
    expect(
      exitCodeForReport(
        report({
          ok: false,
          status: 'awaiting_secrets',
          pendingSecrets: [
            {
              envRef: 'ANTHROPIC_PRIMARY_API_KEY',
              file: '.env',
              reason: 'provider_api_key',
            },
          ],
        }),
      ),
    ).toBe(2);
  });

  it('returns 2 for awaiting_secrets when ok is true (init / secrets-status gate)', () => {
    expect(
      exitCodeForReport(report({ ok: true, status: 'awaiting_secrets' })),
    ).toBe(2);
  });

  it('returns 1 for error', () => {
    expect(exitCodeForReport(report({ ok: false, status: 'error' }))).toBe(1);
  });

  it('returns 1 when status is success but ok is false', () => {
    expect(exitCodeForReport(report({ ok: false, status: 'success' }))).toBe(1);
  });
});
