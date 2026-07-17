/* Frontend ESLint (Vue 3 + TypeScript). CommonJS (.cjs) because package.json is
   ESM. Formatting is owned by Prettier — `prettier` config disables clashing
   rules. Starts at the vue3-essential tier (correctness only); tighten to
   vue3-recommended once the codebase is brought up to its style rules. */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.cjs',
    '*.config.js',
    '*.config.ts',
    // Generated OpenAPI types — not hand-maintained.
    'src/types/api.ts',
    'src/types/api-helpers.ts',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Page/view components are routinely single-word (Login, Dashboard).
    'vue/multi-word-component-names': 'off',
  },
};
