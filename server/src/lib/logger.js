/**
 * Structured JSON logger for server-side observability.
 * Outputs newline-delimited JSON for easy ingestion by log aggregators (e.g., Loki, Datadog).
 */
export const logger = {
  info: (msg, ctx = {}) =>
    console.log(JSON.stringify({ level: 'info', msg, ...ctx, ts: Date.now() })),
  warn: (msg, ctx = {}) =>
    console.log(JSON.stringify({ level: 'warn', msg, ...ctx, ts: Date.now() })),
  error: (msg, ctx = {}) =>
    console.error(JSON.stringify({ level: 'error', msg, ...ctx, ts: Date.now() })),
};
