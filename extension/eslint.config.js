import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules']),

  // Files that use ES module imports (popup.js, config.js, download.js, options.js)
  {
    files: ['popup.js', 'config.js', 'download.js', 'options.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-undef': 'error',

      // ── HUMAN READABILITY STANDARD ──
      'camelcase': ['error', { properties: 'never' }],
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'spaced-comment': ['error', 'always'],
      'max-depth': ['warn', 4],
    },
  },

  // Files that use plain scripts (background.js, content.js, storage.js, offscreen.js)
  {
    files: ['background.js', 'content.js', 'storage.js', 'offscreen.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
        self: 'readonly',
        MediaRecorder: 'readonly',
        FileReader: 'readonly',
        indexedDB: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
])
