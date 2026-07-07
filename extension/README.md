# EnglishFlow Browser Extension

Select any word on any webpage and save it straight to your EnglishFlow
vocabulary — then review it with spaced repetition, without leaving the page.

Built with [WXT](https://wxt.dev) + Vue 3 + TypeScript. One codebase targets
Chrome, Edge, and Firefox (MV3 for Chromium, MV2 for Firefox).

## Features

- **Select-to-save** — select a word and a floating bubble appears; click it to
  open a save panel.
- **Context menu** — right-click a selection → *Add "…" to EnglishFlow*.
- **Auto-suggest** — the panel pre-fills the English definition, an example, and
  a pronunciation audio from the free [Dictionary API](https://dictionaryapi.dev)
  (you type the translation).
- **Deck selection** — save to your personal study list (studyable immediately)
  or into any of your decks.
- **Popup dashboard** — words learned, due-today count, streak, and recently
  added words.
- **Quick review** — run SM-2 spaced-repetition cards right in the popup.

## Security / auth model

- The extension authenticates like the mobile client: `POST /auth/login` returns
  `{ accessToken, refreshToken, user }` in the body. No cookies are used, so the
  backend needs **no changes**.
- Access + refresh tokens live **only** in `chrome.storage.local` and are read
  **only** by the background service worker. Content scripts and web pages never
  see them — they send messages to the background, which performs the API call.
- On a `401`, the background rotates the token via `POST /auth/refresh` exactly
  once, serialized (single-flight), matching the backend's refresh-token rotation
  + reuse-detection.
- MV3 background `fetch` to hosts in `host_permissions` bypasses CORS.

## Development

```bash
cd extension
npm install
npm run dev            # Chrome (opens a dev profile with the extension loaded)
npm run dev:firefox    # Firefox
```

Or load a production build manually:

```bash
npm run build          # → .output/chrome-mv3
npm run build:firefox  # → .output/firefox-mv2
```

Then in Chrome: `chrome://extensions` → enable *Developer mode* → *Load unpacked*
→ pick `.output/chrome-mv3`. In Firefox: `about:debugging` → *This Firefox* →
*Load Temporary Add-on* → pick `.output/firefox-mv2/manifest.json`.

## Configuration

The backend base URL is set at build time from `WXT_API_URL` in [`.env`](./.env)
(default `http://localhost:3000`). It is also injected into `host_permissions`,
so **rebuild after changing it**. End users can override the URL at runtime in
the popup's ⚙ Settings.

For a production build, point `WXT_API_URL` at your deployed API (e.g.
`https://api.englishflow.app`) and rebuild.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `dev:firefox` | Live-reload dev server |
| `npm run build` / `build:firefox` | Production build |
| `npm run zip` / `zip:firefox` | Zip a build for store upload |
| `npm run compile` | Type-check (`vue-tsc --noEmit`) |

## Layout

```
entrypoints/
  background.ts        # service worker: context menu + message router (owns tokens)
  content/             # select-to-save bubble + save panel (Shadow-DOM Vue)
  popup/               # Vue popup: login, dashboard, review, settings
lib/
  api.ts               # authed fetch: Bearer + envelope unwrap + 401→refresh
  auth.ts resources.ts # login/logout/me + words/decks/learning/progress calls
  dictionary.ts        # dictionaryapi.dev lookup
  messages.ts          # typed content/popup ↔ background protocol
  storage.ts types.ts config.ts
```
