import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Config base compartida por todos los paquetes y apps de Bow Sight. */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // CLAUDE.md — Prohibido
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Usar Temporal (@js-temporal/polyfill), no Date. Ver docs/TECNICO.md.',
        },
      ],
    },
  },
  {
    /**
     * Lo que corre en Node y no en el navegador: scripts de la raiz, arnes de
     * E2E, configs y cualquier `.mjs`.
     *
     * Sin esto, `no-undef` marca `process` como no definido en los `.mjs`, que
     * es un falso positivo que ademas tapa los errores de verdad.
     */
    files: ['**/*.mjs', '**/*.cjs', '**/*.config.{js,ts}', 'scripts/**', 'e2e/**'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  {
    // Los tests y los scripts de build pueden usar Date y console: los primeros
    // para armar fixtures y depurar, los segundos porque un build **si** lee el
    // reloj de pared, y no corren en el proceso de la app.
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      'e2e/**',
      '**/*.config.ts',
      '**/scripts/**',
    ],
    rules: {
      'no-restricted-syntax': 'off',
      'no-console': 'off',
    },
  },
);
