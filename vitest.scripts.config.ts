import { defineConfig } from 'vitest/config';

/**
 * Los tests de `scripts/`.
 *
 * Viven fuera de Turborepo porque `scripts/` no es un paquete del workspace: son
 * herramientas de la raiz. Pero se corren igual desde `pnpm test` y
 * `pnpm test:coverage`, porque un script sin test que se ejecuta una sola vez
 * sobre datos reales es el peor lugar para descubrir un error.
 */
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['scripts/import-sqlite.ts'],
      // Alto a proposito: la migracion se corre **una sola vez** sobre datos que
      // no se pueden recuperar. Lo que queda afuera es el manejo de errores de
      // conexion, que no se puede provocar sin romper el servidor de prueba.
      thresholds: { lines: 90, statements: 90, branches: 85, functions: 100 },
    },
  },
});
