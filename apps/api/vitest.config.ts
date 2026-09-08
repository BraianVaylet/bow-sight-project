import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      // Auth, aislamiento y billing suben a 95 cuando lleguen sus modulos.
      thresholds: { lines: 80, statements: 80, branches: 75, functions: 80 },
    },
  },
});
