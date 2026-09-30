const { beforeEach, afterEach, test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createPinia, setActivePinia } = require('pinia')
const { nextTick } = require('vue')

fs.writeFileSync(
  path.join(__dirname, '../.test-build/package.json'),
  JSON.stringify({ type: 'commonjs' }),
)

const storage = new Map()
const toggledClasses = []

global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
}
global.window = {
  matchMedia: () => ({ matches: false }),
}
global.document = {
  documentElement: {
    classList: {
      toggle: (...args) => toggledClasses.push(args),
    },
  },
}

const { useThemeStore } = require('../.test-build/stores/theme.js')
const { getAccessToken, setAccessToken } = require('../.test-build/services/access-token.js')

beforeEach(() => {
  storage.clear()
  toggledClasses.length = 0
  setAccessToken(null)
  setActivePinia(createPinia())
})

afterEach(() => setActivePinia(undefined))

test('theme store restores and persists the selected theme', async () => {
  storage.set('theme', 'dark')
  const theme = useThemeStore()
  assert.equal(theme.isDark, true)
  theme.toggle()
  await nextTick()
  assert.equal(storage.get('theme'), 'light')
  assert.deepEqual(toggledClasses.at(-1), ['dark', false])
})

test('authentication access token stays in module memory, outside Web Storage', () => {
  setAccessToken('short-lived-access-token')
  assert.equal(getAccessToken(), 'short-lived-access-token')
  assert.equal(storage.has('accessToken'), false)
  setAccessToken(null)
  assert.equal(getAccessToken(), null)
})
