import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Builds the nestjs-pino config. Structured JSON everywhere except local dev
 * (pretty-printed) and tests (silent). Every request is logged once at
 * completion with its request id; `/health*` is excluded to avoid probe spam.
 */
export function buildLoggerParams(nodeEnv: string): Params {
  const isProd = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),

      // Reuse an upstream x-request-id when present (preserves the trace from a
      // proxy / mobile client), else mint one, and echo it back so clients can
      // quote it in bug reports. This replaces the old RequestIdMiddleware.
      genReqId: (req: IncomingMessage, res: ServerResponse): string => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const id =
          typeof incoming === 'string' &&
          incoming.length > 0 &&
          incoming.length <= 200
            ? incoming
            : Array.isArray(incoming) && incoming[0]
              ? incoming[0]
              : randomUUID();
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },

      // Pretty, single-line logs in dev; raw JSON in prod/test.
      transport:
        isProd || isTest
          ? undefined
          : {
              target: 'pino-pretty',
              options: { singleLine: true, translateTime: 'SYS:standard' },
            },

      // Lean request/response lines — no headers or bodies, so no credential or
      // session material can leak into logs.
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({
          statusCode: res.statusCode,
        }),
      },

      // Defense in depth for any other log call that includes these keys.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.newPassword',
          '*.currentPassword',
          '*.refreshToken',
          '*.accessToken',
        ],
        remove: true,
      },

      customLogLevel: (
        _req: IncomingMessage,
        res: ServerResponse,
        err?: Error,
      ) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      // Don't log the health/readiness probes on every scrape.
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url === '/health' || req.url === '/health/ready',
      },
    },
  };
}
