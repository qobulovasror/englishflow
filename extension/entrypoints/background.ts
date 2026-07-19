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
    if (text) await openSavePanelInTab(tab.id, text);
  });

  // Single source of truth for every authenticated API call. Use the
  // callback form (return `true` + `sendResponse`) — WXT's `browser` is the
  // NATIVE chrome/browser API, and native Chrome does NOT deliver a Promise
  // returned from an onMessage listener, only an explicit sendResponse().
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only accept messages originating from this extension's own contexts
    // (popup, content scripts). Reject anything else — e.g. a page trying to
    // drive the privileged background if externally_connectable is ever added.
    if (sender.id !== browser.runtime.id) {
      sendResponse({ ok: false, error: 'Unauthorized sender' });
      return false;
    }
    handle(message as AnyRequest, sender).then(sendResponse, (err: unknown) =>
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'Unexpected error',
      }),
    );
    return true; // keep the message channel open for the async response
  });
});

// Session/config-mutating ops must come from the extension UI (popup), never a
// content script running in a web page. A content-script sender carries a
// `tab`; popup/background senders don't.
const EXTENSION_UI_ONLY = new Set<AnyRequest['type']>([
  'LOGIN',
  'LOGOUT',
  'SET_API_URL',
  'GET_API_URL',
]);

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask a tab's content script to open the save panel. Manifest content scripts
 * only auto-inject into pages opened AFTER the extension loads, so for a tab
 * that predates the install we inject the script on demand and retry (its
 * message listener wires up asynchronously).
 */
async function openSavePanelInTab(tabId: number, text: string): Promise<void> {
  const message = { type: 'OPEN_SAVE_PANEL', text };
  try {
    await browser.tabs.sendMessage(tabId, message);
    return;
  } catch {
    // Not injected in this tab yet — inject and retry below.
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });
  } catch {
    return; // Injection is blocked (chrome://, the web store, the PDF viewer, …).
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    await delay(100);
    try {
      await browser.tabs.sendMessage(tabId, message);
      return;
    } catch {
      // Keep retrying while the freshly-injected listener comes up.
    }
  }
}

async function handle(
  msg: AnyRequest,
  sender: Browser.runtime.MessageSender,
): Promise<Result<unknown>> {
  try {
    if (EXTENSION_UI_ONLY.has(msg.type) && sender.tab !== undefined) {
      return { ok: false, error: 'This action is only allowed from the extension UI' };
    }
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
      case 'SET_API_URL': {
        const { sessionCleared } = await storage.setApiUrl(msg.apiUrl);
        return ok({ done: true, sessionCleared });
      }
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
