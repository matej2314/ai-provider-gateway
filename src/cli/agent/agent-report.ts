export type AgentReportStatus = 'success' | 'awaiting_secrets' | 'error';

export interface PendingSecretsItem {
  envRef: string;
  file: '.env';
  reason:
    | 'provider_api_key'
    | 'provider_base_url'
    | 'sentry_dsn'
    | 'redis_password'
    | 'master_key'
    | 'client_gateway_key';
  providerInstance?: string;
  clientId?: string;
}

export interface AgentReport {
  ok: boolean;
  status: AgentReportStatus;
  command: string;
  files?: string[];
  pendingSecrets?: PendingSecretsItem[];
  generatedKeyRefs?: string[];
  warnings?: string[];
  errors?: string[];
  next?: string[];
}

/** Exit: 0 success, 2 awaiting_secrets (human .env handoff), 1 error */
export function exitCodeForReport(report: AgentReport): 0 | 1 | 2 {
  // status is authoritative for the handoff gate (plan §3) — check before !ok
  if (report.status === 'awaiting_secrets') return 2;
  if (report.status === 'error' || !report.ok) return 1;
  return 0;
}

export function emitAgentReport(report: AgentReport, json: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }
}

export function exitWithAgentReport(report: AgentReport, json: boolean): never {
  emitAgentReport(report, json);
  process.exit(exitCodeForReport(report));
}
