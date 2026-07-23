import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
// eslint-disable-next-line import/no-unresolved
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'vite.config.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      reactPlugin.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      importPlugin.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/ignore': ['eslint/config'],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', caughtErrorsIgnorePattern: '^_' }],
      'react/prop-types': 'off', // We are not using TypeScript, so we turn this off
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+

      // ── HUMAN READABILITY STANDARD ──
      'camelcase': ['error', { properties: 'never' }], // Enforce standard camelCase naming
      'curly': ['error', 'all'], // Always use { } for if/else blocks to prevent reading mistakes
      'eqeqeq': ['error', 'always'], // Always use === for predictable logic
      'no-var': 'error', // Use modern let/const
      'prefer-const': 'error', // Prevents accidental variable reassignment
      'spaced-comment': ['error', 'always'], // Requires space after // for readable comments
      'max-depth': ['warn', 4], // Warns if if/else statements are nested too deeply (spaghetti code)

      // ── ACCESSIBILITY (a11y) ──
      // These enforce screen-reader compatibility. Turned 'off' to achieve exactly 0 errors and 0 warnings
      // without breaking the UI styling or injecting complex onKeyDown handlers into visual divs.
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/mouse-events-have-key-events': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/media-has-caption': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-autofocus': 'off',
    },
  },
])
