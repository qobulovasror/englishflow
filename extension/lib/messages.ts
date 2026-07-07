import type {
  AuthState,
  DailyWord,
  DashboardData,
  Deck,
  DictionaryResult,
  Rating,
  ReviewResult,
  SaveWordInput,
  User,
} from './types';

/**
 * Typed request/response contract between the UI surfaces (popup, content
 * script) and the background service worker. The background is the ONLY place
 * that touches tokens or the API — everyone else goes through these messages.
 */
export interface MessageMap {
  AUTH_STATE: { req: Record<never, never>; res: AuthState };
  LOGIN: { req: { email: string; password: string }; res: User };
  REGISTER: { req: { email: string; password: string }; res: User };
  LOGOUT: { req: Record<never, never>; res: { done: true } };
  SAVE_WORD: { req: { input: SaveWordInput }; res: { done: true } };
  LOOKUP: { req: { term: string }; res: DictionaryResult | null };
  LIST_DECKS: { req: Record<never, never>; res: Deck[] };
  DASHBOARD: { req: Record<never, never>; res: DashboardData };
  DAILY: { req: Record<never, never>; res: DailyWord[] };
  REVIEW: { req: { userWordId: string; rating: Rating }; res: ReviewResult };
  GET_API_URL: { req: Record<never, never>; res: { apiUrl: string } };
  SET_API_URL: { req: { apiUrl: string }; res: { done: true } };
  OPEN_POPUP: { req: Record<never, never>; res: { done: boolean } };
}

export type MessageType = keyof MessageMap;
export type Request<T extends MessageType> = { type: T } & MessageMap[T]['req'];
export type AnyRequest = { [T in MessageType]: Request<T> }[MessageType];

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Background → content-script (single tab) channel. Not part of MessageMap. */
export interface OpenSavePanelMessage {
  type: 'OPEN_SAVE_PANEL';
  text: string;
}

/** Send a typed request to the background worker and await its typed result. */
export function sendMessage<T extends MessageType>(
  type: T,
  payload: MessageMap[T]['req'] = {} as MessageMap[T]['req'],
): Promise<Result<MessageMap[T]['res']>> {
  return browser.runtime.sendMessage({ type, ...payload }) as Promise<
    Result<MessageMap[T]['res']>
  >;
}
