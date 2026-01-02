/**
 * STRICT ESLint Configuration for New Code
 * 
 * This configuration enforces stricter rules for new code to prevent
 * the introduction of new TypeScript errors and maintain code quality.
 * 
 * Usage:
 *   pnpm eslint --config eslint.config.strict.js <files>
 * 
 * For pre-commit hooks, this is automatically applied to staged files.
 */

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
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
        // Enable type-aware linting for stricter checks
        project: './tsconfig.json',
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
      // STRICT TypeScript Rules (errors for new code)
      // ============================================================
      
      // No 'any' type - ENFORCED for new code
      '@typescript-eslint/no-explicit-any': 'error',
      
      // No unused variables - ENFORCED
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      
      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      
      // No non-null assertions (use proper null checks)
      '@typescript-eslint/no-non-null-assertion': 'error',
      
      // Prefer nullish coalescing over logical OR
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      
      // Prefer optional chaining
      '@typescript-eslint/prefer-optional-chain': 'warn',
      
      // No floating promises (must await or void)
      '@typescript-eslint/no-floating-promises': 'error',
      
      // No misused promises
      '@typescript-eslint/no-misused-promises': 'error',
      
      // Require await in async functions
      '@typescript-eslint/require-await': 'warn',
      
      // ============================================================
      // React Rules - STRICT
      // ============================================================
      
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error', // Upgraded to error
      
      // ============================================================
      // General Rules - STRICT
      // ============================================================
      
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'error',
      'require-await': 'off', // Use TypeScript version
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
      // Legacy files that haven't been migrated yet
      // Add specific legacy files here as needed
    ],
  },
];
