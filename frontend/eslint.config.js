import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig, globalIgnores } from 'eslint/config';
import * as reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.Config} */
export default defineConfig([
  globalIgnores([
    'node_modules/',
    'bindings/',
    'dist/',
    'build/',
    'src/assets/',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    settings: {
      react: {
        // Using "detect" is recommended as it automatically determines the version
        version: 'detect',
      },
    },
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
      pluginReact.configs.flat.recommended,
    ],
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',
      // Disable the rule that requires React to be in scope for JSX
      'react/react-in-jsx-scope': 'off',
    },
  },
]);
