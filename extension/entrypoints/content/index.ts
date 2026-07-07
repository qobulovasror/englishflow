import { createApp } from 'vue';
import type { OpenSavePanelMessage } from '../../lib/messages';
import ContentApp from './ContentApp.vue';
import { hideBubble, openPanel, showBubble, state } from './state';

const MAX_SELECTION_CHARS = 60;
const MAX_SELECTION_WORDS = 4;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'englishflow-ui',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        const app = createApp(ContentApp);
        app.mount(container);
        return app;
      },
      onRemove: (app) => app?.unmount(),
    });
    ui.mount();

    const host = ui.shadowHost;

    const evaluateSelection = () => {
      if (state.panelVisible) return; // don't fight the open panel
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (!sel || sel.rangeCount === 0 || !text) return hideBubble();
      // Only offer the bubble for a word or short phrase.
      if (text.length > MAX_SELECTION_CHARS || text.split(/\s+/).length > MAX_SELECTION_WORDS) {
        return hideBubble();
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return hideBubble();
      showBubble(rect.left + rect.width / 2, rect.top, text);
    };

    document.addEventListener('mouseup', (e) => {
      if (e.composedPath().includes(host)) return; // clicks on our own UI
      // Defer a tick so the browser finalises the selection first.
      setTimeout(evaluateSelection, 0);
    });

    document.addEventListener('selectionchange', () => {
      if (!window.getSelection()?.toString().trim()) hideBubble();
    });

    // Context-menu path: background asks this tab to open the panel.
    browser.runtime.onMessage.addListener((msg: OpenSavePanelMessage) => {
      if (msg?.type === 'OPEN_SAVE_PANEL') openPanel(msg.text);
    });
  },
});
