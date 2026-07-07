import { storage } from './storage';
import type { AuthResponse } from './types';

/** Thrown for non-2xx API responses. `status` lets callers special-case 401. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOpts {
  /** Attach the Bearer token and auto-refresh on 401. Default true. */
  auth?: boolean;
  /** Set false to skip the refresh-and-retry (used by refresh/logout). */
  retry?: boolean;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const raw = body?.message ?? `Request failed (${res.status})`;
    throw new ApiError(Array.isArray(raw) ? raw.join(', ') : String(raw), res.status);
  }

  // Backend wraps success responses in { success, data, timestamp }.
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

// ── Single-flight refresh ────────────────────────────────────────────────────
// Concurrent 401s must share ONE /auth/refresh call: the backend rotates the
// refresh token and treats a reused token as theft (revoking the whole chain).
let refreshInFlight: Promise<string | null> | null = null;

function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;
  const base = await storage.getApiUrl();
  try {
    const res = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // 400/401/403 → the refresh token is invalid/expired/reused: session is
      // dead, clear it. Leave the session intact for transient server errors
      // (5xx) so a later retry can still recover it.
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        await storage.clearSession();
      }
      return null;
    }
    const data = await parse<AuthResponse>(res);
    await storage.setSession(data.accessToken, data.refreshToken, data.user);
    return data.accessToken;
  } catch {
    // Network error — keep the session so a later retry can succeed.
    return null;
  }
}

/** Low-level authenticated fetch against the EnglishFlow backend. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: FetchOpts = {},
): Promise<T> {
  const auth = opts.auth ?? true;
  const base = await storage.getApiUrl();

  const build = async (token?: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${base}${path}`, { ...init, headers });
  };

  let token = auth ? await storage.getAccessToken() : undefined;
  let res = await build(token);

  if (res.status === 401 && auth && opts.retry !== false) {
    const fresh = await refreshOnce();
    if (fresh) res = await build(fresh);
  }

  return parse<T>(res);
}
