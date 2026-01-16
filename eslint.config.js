import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        
        // Web APIs
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        HeadersInit: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        
        // Storage APIs
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        
        // Node.js globals (for server files)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      // ============================================================
      // TypeScript Rules - Stricter for new code (Phase 1 mitigation)
      // ============================================================
      
      // No 'any' type - warn for now, will be error in Phase 2
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // No unused variables - error to prevent new issues
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      
      // Explicit return types - off for now, enable in Phase 2
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // No non-null assertions - warn to encourage proper null checks
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // ============================================================
      // React Rules
      // ============================================================

      'react/react-in-jsx-scope': 'off', // Not needed in React 19
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/no-array-index-key': 'error', // Prevent key={index} anti-pattern
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // ============================================================
      // General Rules - Stricter for code quality
      // ============================================================
      
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error', // Upgraded from warn
      'no-unused-vars': 'off', // Use TypeScript version instead
      'prefer-const': 'error', // Upgraded from warn
      'no-var': 'error',
      'eqeqeq': ['error', 'always'], // Require strict equality
      'no-eval': 'error', // Security: no eval
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.turbo/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
];

