import { defineConfig } from 'wxt';
import { loadEnv } from 'vite';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  // AMO's data-collection disclosure only matters at store-submission time.
  suppressWarnings: { firefoxDataCollection: true },
  // `manifest` is a function so it can read the mode-specific env (.env vs
  // .env.production) — the API origin must be a host permission for the MV3
  // background `fetch` to bypass CORS, and it must match the URL the bundle
  // actually calls (import.meta.env.WXT_API_URL).
  manifest: ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'WXT_');
    const apiUrl = env.WXT_API_URL || 'http://localhost:3000';
    let apiHostPattern = 'http://localhost:3000/*';
    try {
      apiHostPattern = `${new URL(apiUrl).origin}/*`;
    } catch {
      // keep the default if WXT_API_URL is malformed
    }

    return {
      name: 'EnglishFlow — Vocabulary Saver',
      description:
        'Select any word on the web and save it to your EnglishFlow vocabulary. Review with spaced repetition.',
      permissions: ['contextMenus', 'storage', 'activeTab', 'scripting'],
      host_permissions: [apiHostPattern, 'https://api.dictionaryapi.dev/*'],
      // Firefox requires a stable add-on ID (ignored by Chromium builds).
      browser_specific_settings: {
        gecko: { id: 'englishflow@qobulovasror' },
      },
    };
  },
});
