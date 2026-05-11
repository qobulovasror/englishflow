import { Response } from 'express';
import { CookieOptions } from 'express';
import { AppConfig, JwtConfig } from '../../config/configuration';

/**
 * Name of the `httpOnly` cookie that carries the refresh token for web
 * clients. Mobile clients ignore cookies and continue to send/receive the
 * token via the JSON body.
 *
 * Kept on `path=/auth` so it's only sent to the auth endpoints — the rest
 * of the API never sees it, reducing the blast radius.
 */
export const REFRESH_COOKIE_NAME = 'refresh_token';

export function buildRefreshCookieOptions(
  appConfig: AppConfig,
  jwtConfig: JwtConfig,
): CookieOptions {
  return {
    httpOnly: true,
    // HTTPS-only in production; over plain HTTP in dev so the cookie still
    // flows between localhost:5173 and localhost:3000.
    secure: appConfig.nodeEnv === 'production',
    // `lax` is enough as long as the SPA and API are same-site (eTLD+1).
    // For unrelated origins, switch to `none` + `secure` and add CSRF tokens.
    sameSite: 'lax',
    path: '/auth',
    maxAge: jwtConfig.refreshExpiresInDays * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  appConfig: AppConfig,
  jwtConfig: JwtConfig,
): void {
  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    buildRefreshCookieOptions(appConfig, jwtConfig),
  );
}

export function clearRefreshCookie(res: Response): void {
  // Match path/sameSite/httpOnly so the browser clears the right cookie.
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/auth',
  });
}
