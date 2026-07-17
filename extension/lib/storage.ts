import { DEFAULT_API_URL } from './config';
import type { User } from './types';

/**
 * Validates and canonicalises a user-entered API base URL. Rejects anything
 * that isn't a well-formed http(s) URL and forbids plaintext http:// for
 * non-localhost hosts — otherwise a typo'd or hostile origin could receive the
 * Bearer access token (and, on the 401 path, the refresh token in the body).
 * Returns `origin + path` with query/hash and trailing slashes stripped.
 */
export function normalizeApiUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('Enter a valid URL, including http:// or https://.');
  }
  const isLocal =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
    throw new Error(
      'The API server must use https:// (http:// is only allowed for localhost).',
    );
  }
  const path = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${path}`;
}

/**
 * Token vault. Access + refresh tokens live ONLY in `chrome.storage.local`,
 * read/written ONLY by the background service worker. Content scripts and web
 * pages never see them — they message the background instead. This keeps tokens
 * out of any page's JS context.
 */
const KEY = {
  access: 'ef_access_token',
  refresh: 'ef_refresh_token',
  user: 'ef_user',
  apiUrl: 'ef_api_url',
} as const;

async function get<T>(key: string): Promise<T | undefined> {
  const res = await browser.storage.local.get(key);
  return res[key] as T | undefined;
}

export const storage = {
  getAccessToken: () => get<string>(KEY.access),
  getRefreshToken: () => get<string>(KEY.refresh),

  async getUser(): Promise<User | undefined> {
    return get<User>(KEY.user);
  },

  async setSession(accessToken: string, refreshToken: string, user: User): Promise<void> {
    await browser.storage.local.set({
      [KEY.access]: accessToken,
      [KEY.refresh]: refreshToken,
      [KEY.user]: user,
    });
  },

  async setUser(user: User): Promise<void> {
    await browser.storage.local.set({ [KEY.user]: user });
  },

  async clearSession(): Promise<void> {
    await browser.storage.local.remove([KEY.access, KEY.refresh, KEY.user]);
  },

  async getApiUrl(): Promise<string> {
    return (await get<string>(KEY.apiUrl)) || DEFAULT_API_URL;
  },

  /**
   * Persists a validated API base URL. When the *origin* changes, the current
   * session is cleared first: tokens minted by the old server must never be
   * sent to a different origin. Returns whether the session was cleared so the
   * caller can reflect the forced logout in the UI.
   */
  async setApiUrl(url: string): Promise<{ sessionCleared: boolean }> {
    const normalized = normalizeApiUrl(url);
    const current = await this.getApiUrl();
    const originChanged = new URL(normalized).origin !== new URL(current).origin;
    if (originChanged) {
      await this.clearSession();
    }
    await browser.storage.local.set({ [KEY.apiUrl]: normalized });
    return { sessionCleared: originChanged };
  },
};
