import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter, ErrorResponseBody } from './all-exceptions.filter';

interface CapturedReply {
  status: number;
  body: ErrorResponseBody;
}

/** Builds a host + filter pair that records the response written by the filter. */
function makeHarness(opts: { nodeEnv?: 'development' | 'production' } = {}) {
  const captured: CapturedReply = { status: 0, body: undefined as never };

  const httpAdapter = {
    reply: jest.fn((_res: unknown, body: ErrorResponseBody, status: number) => {
      captured.status = status;
      captured.body = body;
    }),
    getRequestUrl: jest.fn(() => '/test/path'),
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', url: '/test/path' }),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;

  const configService = {
    get: jest.fn(() => ({ nodeEnv: opts.nodeEnv ?? 'development' })),
  } as unknown as ConfigService;

  const filter = new AllExceptionsFilter(
    { httpAdapter } as unknown as HttpAdapterHost,
    configService,
  );

  return { filter, host, captured };
}

describe('AllExceptionsFilter', () => {
  // Silence the Nest Logger to keep test output clean.
  beforeAll(() => {
    jest
      .spyOn(require('@nestjs/common').Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn(require('@nestjs/common').Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  it('normalizes a string-message HttpException', () => {
    const { filter, host, captured } = makeHarness();

    filter.catch(new NotFoundException('Word not found'), host);

    expect(captured.status).toBe(HttpStatus.NOT_FOUND);
    expect(captured.body).toMatchObject({
      success: false,
      statusCode: 404,
      message: 'Word not found',
      path: '/test/path',
    });
    expect(typeof captured.body.timestamp).toBe('string');
  });

  it('flattens validation pipe array messages into errors[]', () => {
    const { filter, host, captured } = makeHarness();

    filter.catch(
      new BadRequestException({
        message: ['email must be an email', 'password too short'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host,
    );

    expect(captured.status).toBe(400);
    expect(captured.body.message).toBe('Validation failed');
    expect(captured.body.errors).toEqual([
      'email must be an email',
      'password too short',
    ]);
  });

  it.each([
    [new UnauthorizedException('bad creds'), 401, 'bad creds'],
    [new ForbiddenException('forbidden'), 403, 'forbidden'],
    [new ConflictException('dup'), 409, 'dup'],
  ])('maps %p to status %d', (exc, expectedStatus, expectedMessage) => {
    const { filter, host, captured } = makeHarness();
    filter.catch(exc, host);
    expect(captured.status).toBe(expectedStatus);
    expect(captured.body.message).toBe(expectedMessage);
  });

  it('maps Prisma P2002 (unique constraint) to 409 Conflict', () => {
    const { filter, host, captured } = makeHarness();

    const err = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: ['email'] },
      },
    );

    filter.catch(err, host);

    expect(captured.status).toBe(409);
    expect(captured.body.error).toBe('Conflict');
    expect(captured.body.message).toContain('email');
  });

  it('maps Prisma P2025 (record not found) to 404', () => {
    const { filter, host, captured } = makeHarness();
    const err = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      { code: 'P2025', clientVersion: 'x' },
    );

    filter.catch(err, host);

    expect(captured.status).toBe(404);
    expect(captured.body.message).toBe('Record not found');
  });

  it('maps Prisma P2003 (FK violation) to 400', () => {
    const { filter, host, captured } = makeHarness();
    const err = new Prisma.PrismaClientKnownRequestError(
      'FK violation',
      { code: 'P2003', clientVersion: 'x' },
    );

    filter.catch(err, host);

    expect(captured.status).toBe(400);
  });

  it('maps PrismaClientValidationError to 400', () => {
    const { filter, host, captured } = makeHarness();
    const err = new Prisma.PrismaClientValidationError('bad query', {
      clientVersion: 'x',
    });

    filter.catch(err, host);

    expect(captured.status).toBe(400);
    expect(captured.body.message).toBe('Invalid database query');
  });

  it('returns 500 for unknown exceptions in development with original message', () => {
    const { filter, host, captured } = makeHarness({ nodeEnv: 'development' });

    filter.catch(new Error('boom'), host);

    expect(captured.status).toBe(500);
    expect(captured.body.message).toBe('boom');
  });

  it('hides 500 details in production', () => {
    const { filter, host, captured } = makeHarness({ nodeEnv: 'production' });

    filter.catch(new Error('sensitive internal detail'), host);

    expect(captured.status).toBe(500);
    expect(captured.body.message).toBe('Internal server error');
    expect(captured.body.message).not.toContain('sensitive');
  });

  it('does NOT hide 4xx messages in production', () => {
    const { filter, host, captured } = makeHarness({ nodeEnv: 'production' });

    filter.catch(new NotFoundException('Word not found'), host);

    expect(captured.body.message).toBe('Word not found');
  });

  it('non-HttpException exception that throws a string falls through to 500', () => {
    const { filter, host, captured } = makeHarness();
    // simulate a thrown non-Error value
    filter.catch('weird non-error', host);
    expect(captured.status).toBe(500);
  });

  it('embeds path and ISO timestamp', () => {
    const { filter, host, captured } = makeHarness();
    filter.catch(new BadRequestException('x'), host);

    expect(captured.body.path).toBe('/test/path');
    expect(new Date(captured.body.timestamp).toISOString()).toBe(
      captured.body.timestamp,
    );
  });
});

// Sanity check that the HttpException branch handles object responses without
// a `message` key (rare but possible when callers throw with a custom body).
describe('AllExceptionsFilter — edge cases', () => {
  it('handles HttpException with object body and no message', () => {
    const { filter, host, captured } = makeHarness();
    filter.catch(
      new HttpException({ error: 'Teapot' }, HttpStatus.I_AM_A_TEAPOT),
      host,
    );
    expect(captured.status).toBe(418);
    expect(captured.body.error).toBe('Teapot');
  });
});
