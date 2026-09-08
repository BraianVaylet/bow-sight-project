import base from '@bow-sight/config/eslint/base';
import { reactLayer } from '@bow-sight/config/eslint/react';

/**
 * Un solo config para todo el monorepo.
 *
 * Flat config resuelve UN config subiendo desde el cwd, asi que las reglas por
 * app viven aca con globs `files`. Eso mantiene `lint-staged` (que corre desde
 * la raiz) identico a `pnpm lint`.
 */
const WEB_APPS = [
  'apps/pwa/**/*.{ts,tsx}',
  'apps/landing/**/*.{ts,tsx}',
  'packages/ui/**/*.{ts,tsx}',
];

export default [
  ...base,
  reactLayer(WEB_APPS),

  {
    // ADR-002: los modulos se comunican por interfaces o eventos de dominio.
    // Importar las entrañas de otro modulo se bloquea con lint, no con buena voluntad.
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Las barras van dobles: esto es un string, no un literal de regex.
              // Con una sola, JS se las come y `\.` llega como `.`, que matchea
              // cualquier caracter.
              regex: '^(\\.\\./){2,}[^./]+/(domain|application|infrastructure)/',
              message:
                'Prohibido importar de otro modulo. Usar su interfaz publica o un evento de dominio (ADR-002).',
            },
          ],
        },
      ],
    },
  },

  {
    // El dominio es PURO: sin I/O, sin framework, sin reloj, sin azar.
    // Es la regla que protege el activo tecnico del producto (ADR-001).
    files: ['packages/domain/**/*.ts'],
    ignores: ['packages/domain/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['mongoose', 'mongodb', 'hono', 'react', 'react-dom', 'node:*', 'fs', 'path'],
              message:
                '@bow-sight/domain es matematica pura: sin I/O, sin framework, sin Node. Ver ADR-001.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'El dominio no hace I/O.' },
        { name: 'localStorage', message: 'El dominio no toca el navegador.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'El dominio no lee el reloj: se inyecta desde afuera.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'El dominio es determinista: nada de azar.',
        },
      ],
    },
  },

  {
    // Frontera de estado: Query = servidor, Zustand = UI.
    files: ['**/state/**/*.{ts,tsx}', '**/stores/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              message:
                'Estado de servidor va en Query, no en Zustand. Zustand es solo estado de UI.',
            },
          ],
        },
      ],
    },
  },

  {
    // El provider y su hook viven juntos a proposito: separarlos obliga a
    // importar de dos archivos para usar una sola cosa. Se concede por nombre,
    // nunca apagando la regla.
    files: ['packages/ui/src/theme.tsx'],
    rules: {
      'react-refresh/only-export-components': ['error', { allowExportNames: ['useTheme'] }],
    },
  },

  {
    // `vite-react-ssg` exige que la landing exporte `routes` desde un modulo
    // que tambien exporta componentes. Se concede por nombre, nunca apagando la regla.
    files: ['apps/landing/src/routes.tsx'],
    rules: {
      'react-refresh/only-export-components': ['error', { allowExportNames: ['routes'] }],
    },
  },
];
