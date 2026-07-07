import { getAuthState, login, logout } from '../lib/auth';
import { lookup } from '../lib/dictionary';
import type { AnyRequest, Result } from '../lib/messages';
import { getDaily, getDashboard, listDecks, saveWord, submitReview } from '../lib/resources';
import { storage } from '../lib/storage';

const MENU_ID = 'ef-add-word';

export default defineBackground(() => {
  // Right-click on a selection → "Add "…" to EnglishFlow".
  browser.runtime.onInstalled.addListener(async () => {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({
      id: MENU_ID,
      title: 'Add “%s” to EnglishFlow',
      contexts: ['selection'],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab?.id) return;
    const text = (info.selectionText ?? '').trim();
    if (!text) return;
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'OPEN_SAVE_PANEL', text });
    } catch {
      // No content script here (chrome://, the web store, PDFs, …) — ignore.
    }
  });

  // Single source of truth for every authenticated API call. Use the
  // callback form (return `true` + `sendResponse`) — WXT's `browser` is the
  // NATIVE chrome/browser API, and native Chrome does NOT deliver a Promise
  // returned from an onMessage listener, only an explicit sendResponse().
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handle(message as AnyRequest).then(sendResponse, (err: unknown) =>
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'Unexpected error',
      }),
    );
    return true; // keep the message channel open for the async response
  });
});

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

async function handle(msg: AnyRequest): Promise<Result<unknown>> {
  try {
    switch (msg.type) {
      case 'AUTH_STATE':
        return ok(await getAuthState());
      case 'LOGIN':
        return ok(await login(msg.email, msg.password));
      case 'LOGOUT':
        await logout();
        return ok({ done: true });
      case 'SAVE_WORD':
        await saveWord(msg.input);
        return ok({ done: true });
      case 'LOOKUP':
        return ok(await lookup(msg.term));
      case 'LIST_DECKS':
        return ok(await listDecks());
      case 'DASHBOARD':
        return ok(await getDashboard());
      case 'DAILY':
        return ok(await getDaily());
      case 'REVIEW':
        return ok(await submitReview(msg.userWordId, msg.rating));
      case 'GET_API_URL':
        return ok({ apiUrl: await storage.getApiUrl() });
      case 'SET_API_URL':
        await storage.setApiUrl(msg.apiUrl);
        return ok({ done: true });
      case 'OPEN_POPUP':
        return ok({ done: await openPopup() });
      default:
        return { ok: false, error: `Unknown message: ${(msg as { type: string }).type}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

async function openPopup(): Promise<boolean> {
  const action = browser.action as unknown as { openPopup?: () => Promise<void> };
  try {
    if (action.openPopup) {
      await action.openPopup();
      return true;
    }
  } catch {
    // openPopup needs a user gesture and isn't available everywhere.
  }
  return false;
}
