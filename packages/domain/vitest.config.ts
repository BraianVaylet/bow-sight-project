import { defineConfig } from 'vitest/config';

/**
 * El dominio es el activo tecnico del producto: cobertura 95% y sin excepciones.
 * Si un test de aca cambia, cambio el comportamiento — no el test.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 95, statements: 95, branches: 90, functions: 95 },
    },
  },
});
