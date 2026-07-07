import { defineConfig } from 'wxt';

// The API origin must be declared as a host permission so the MV3 background
// service worker can `fetch()` it without CORS. Derived from WXT_API_URL at
// build time; falls back to the dev backend. Override via `.env` (see .env).
const API_URL = process.env.WXT_API_URL || 'http://localhost:3000';
let apiHostPattern = 'http://localhost:3000/*';
try {
  apiHostPattern = `${new URL(API_URL).origin}/*`;
} catch {
  // keep the default if WXT_API_URL is malformed
}

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  // AMO's data-collection disclosure only matters at store-submission time.
  suppressWarnings: { firefoxDataCollection: true },
  manifest: {
    name: 'EnglishFlow — Vocabulary Saver',
    description:
      'Select any word on the web and save it to your EnglishFlow vocabulary. Review with spaced repetition.',
    permissions: ['contextMenus', 'storage', 'activeTab', 'scripting'],
    host_permissions: [apiHostPattern, 'https://api.dictionaryapi.dev/*'],
    // Firefox requires a stable add-on ID (ignored by Chromium builds).
    browser_specific_settings: {
      gecko: { id: 'englishflow@qobulovasror' },
    },
  },
});
