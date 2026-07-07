import { apiFetch, ApiError } from './api';
import { storage } from './storage';
import type { AuthResponse, AuthState, User } from './types';

/** POST /auth/login → persist the session (both tokens + user). */
export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    { auth: false },
  );
  await storage.setSession(data.accessToken, data.refreshToken, data.user);
  return data.user;
}

/** Best-effort server-side revocation, then always clear local session. */
export async function logout(): Promise<void> {
  const refreshToken = await storage.getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch(
        '/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        { auth: false, retry: false },
      );
    } catch {
      // Ignore — logout must never be blocked by a network/server error.
    }
  }
  await storage.clearSession();
}

/**
 * Resolve the current auth state. Verifies the token with GET /users/me
 * (which transparently refreshes on 401). Falls back to the cached user on a
 * network hiccup so the popup still works offline.
 */
export async function getAuthState(): Promise<AuthState> {
  const token = await storage.getAccessToken();
  if (!token) return { authenticated: false };

  try {
    const user = await apiFetch<User>('/users/me');
    await storage.setUser(user);
    return { authenticated: true, user };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await storage.clearSession();
      return { authenticated: false };
    }
    const cached = await storage.getUser();
    return cached ? { authenticated: true, user: cached } : { authenticated: false };
  }
}
