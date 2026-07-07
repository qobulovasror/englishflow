import { DEFAULT_API_URL } from './config';
import type { User } from './types';

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

  async setApiUrl(url: string): Promise<void> {
    await browser.storage.local.set({ [KEY.apiUrl]: url.replace(/\/+$/, '') });
  },
};
