/**
 * Compile-time default API base URL, injected from `WXT_API_URL` (see .env).
 * The effective base URL at runtime can be overridden by the user in the popup
 * Settings — see `storage.getApiUrl()`.
 */
export const DEFAULT_API_URL: string =
  (import.meta.env.WXT_API_URL as string | undefined) || 'http://localhost:3000';

/** Base URL of the web app — used to send users to sign-up / account pages. */
export const WEB_URL: string =
  (import.meta.env.WXT_WEB_URL as string | undefined) || 'http://localhost:5173';

export const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
