import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Tags every request with an ID so log lines and error bodies can be
 * correlated across services.
 *
 *  - If the caller already sent `x-request-id` we keep it (preserves the
 *    upstream trace from a reverse proxy / mobile client).
 *  - Otherwise we mint a fresh UUID.
 *
 * The ID is exposed on `req.id` for use by interceptors/filters, and echoed
 * back on the response header so the client can quote it when reporting bugs.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id =
      (typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 200
        ? incoming
        : Array.isArray(incoming) && incoming[0]
          ? incoming[0]
          : randomUUID());
    req.id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
