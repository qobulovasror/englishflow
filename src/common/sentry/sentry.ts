import * as Sentry from '@sentry/node';

let enabled = false;

/**
 * Initialises Sentry error tracking IF a DSN is configured. Without `SENTRY_DSN`
 * this is a no-op, so the app runs identically in local/dev. Call once, as early
 * as possible in bootstrap.
 */
export function initSentry(dsn: string | undefined, environment: string): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    // Errors only by default — turn up tracesSampleRate to sample performance.
    tracesSampleRate: 0,
  });
  enabled = true;
}

/** Whether Sentry was initialised (a DSN was provided). */
export function isSentryEnabled(): boolean {
  return enabled;
}

/** Reports an exception to Sentry when enabled; no-op otherwise. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
