import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim() ?? '';

function isSentryMetricsEnabled(): boolean {
  const override = process.env.AI_METRICS_BACKEND?.toLowerCase();
  if (override === 'noop') return false;
  if (override === 'sentry') return true;
  return process.env.NODE_ENV === 'production';
}

function isSentryErrorReportingEnabled(): boolean {
  const override = process.env.ERROR_REPORTING_ADAPTER?.toLowerCase();
  if (override === 'noop') return false;
  if (override === 'sentry') return true;
  return process.env.NODE_ENV === 'production';
}

if (dsn && (isSentryMetricsEnabled() || isSentryErrorReportingEnabled())) {
  const tracesSampleRate = Number(
    process.env.SENTRY_TRACES_SAMPLE_RATE ?? '1.0',
  );

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate)
      ? tracesSampleRate
      : 1.0,
    streamGenAiSpans: isSentryMetricsEnabled(),
    defaultIntegrations: false,
  });
}
