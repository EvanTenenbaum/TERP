import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
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
        RequestInfo: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLIFrameElement: 'readonly',
        HTMLStyleElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        BeforeUnloadEvent: 'readonly',
        MediaQueryListEvent: 'readonly',
        MediaQueryList: 'readonly',
        Event: 'readonly',
        Element: 'readonly',
        Document: 'readonly',
        // Animation & Timing APIs
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // SSE APIs
        EventSource: 'readonly',
        // Observer APIs
        ResizeObserver: 'readonly',
        
        // Storage APIs
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        
        // Node.js globals (for server files)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        NodeRequire: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      // ============================================================
      // TypeScript Rules
      // ============================================================

      // No 'any' type - error to enforce type safety
      '@typescript-eslint/no-explicit-any': 'error',

      // No unused variables - error to prevent dead code
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Explicit return types - off (TypeScript infers well)
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // No non-null assertions - error to enforce proper null handling
      '@typescript-eslint/no-non-null-assertion': 'error',

      // ============================================================
      // React Rules
      // ============================================================

      'react/react-in-jsx-scope': 'off', // Not needed in React 19
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/no-array-index-key': 'error', // Prevent key={index} anti-pattern
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error', // Enforce complete deps

      // ============================================================
      // General Rules
      // ============================================================

      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'], // Require strict equality
      'no-eval': 'error', // Security: no eval

      // ============================================================
      // SECURITY PATTERNS — Actor attribution from client input
      //
      // These selectors flag specific property assignments where actor
      // identity is sourced from client-supplied tRPC input instead of
      // getAuthenticatedUserId(ctx). The || 1 / ?? 1 auth fallback
      // patterns are enforced by the pre-commit hook (see .husky/pre-commit).
      // ============================================================
      'no-restricted-syntax': [
        'error',
        // Forbidden: actorId: input.createdBy
        {
          selector: "Property[key.name='actorId'][value.type='MemberExpression'][value.object.name='input'][value.property.name='createdBy']",
          message: "Forbidden: actor attribution via input.createdBy. Actor must come from getAuthenticatedUserId(ctx).",
        },
        // Forbidden: createdBy: input.createdBy
        {
          selector: "Property[key.name='createdBy'][value.type='MemberExpression'][value.object.name='input'][value.property.name='createdBy']",
          message: "Forbidden: actor attribution via input.createdBy. Actor must come from getAuthenticatedUserId(ctx).",
        },
        // Forbidden: uploadedBy: input.userId
        {
          selector: "Property[key.name='uploadedBy'][value.type='MemberExpression'][value.object.name='input'][value.property.name='userId']",
          message: "Forbidden: actor attribution via input.userId. Actor must come from getAuthenticatedUserId(ctx).",
        },
        // Forbidden: actorId: input.userId
        {
          selector: "Property[key.name='actorId'][value.type='MemberExpression'][value.object.name='input'][value.property.name='userId']",
          message: "Forbidden: actor attribution via input.userId. Actor must come from getAuthenticatedUserId(ctx).",
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Test files - Vitest globals and DOM types
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        // Test utilities
        db: 'readonly',
        mockDb: 'readonly',
        // DOM types used in tests
        HTMLButtonElement: 'readonly',
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
