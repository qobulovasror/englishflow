/* Backend ESLint config (NestJS + TypeScript). Formatting is owned by Prettier
   — `eslint-config-prettier` disables any rules that would fight it. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'frontend/',
    'mobile/',
    'extension/',
    '*.js',
    'openapi.json',
  ],
  rules: {
    // Surface, don't block, these while the codebase is brought up to standard.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // NestJS style: return types are usually inferred; empty ctors/interfaces
    // are common and harmless.
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
  },
  overrides: [
    {
      // Test files lean on `any` and non-null assertions for terse fixtures.
      files: ['**/*.spec.ts', 'test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        // Tests use require() for dynamic module spying/error construction.
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
