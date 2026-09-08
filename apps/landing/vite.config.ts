import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // `sitemap.xml` y `robots.txt` salen del build, no de archivos a mano que
      // se desactualizan sin que nadie se entere.
      name: 'bow-sight:seo',
      apply: 'build',
      async closeBundle() {
        const { buildRobots, buildSitemap } = await import('./src/seo.js');
        const out = resolve(import.meta.dirname, 'dist');
        // Fecha en UTC: asi el build es identico corra donde corra.
        const hoy = new Date().toISOString().slice(0, 10);
        writeFileSync(resolve(out, 'sitemap.xml'), buildSitemap(hoy), 'utf8');
        writeFileSync(resolve(out, 'robots.txt'), buildRobots(), 'utf8');
      },
    },
  ],
  /**
   * 🔴 El puerto va aca y no en el script.
   *
   * `vite-react-ssg dev` **ignora `--port`**: se levantaba en el 5173 por
   * defecto, chocaba con la PWA y se corria sola al 5174. En silencio, asi que
   * los E2E esperaban 120 segundos a un servidor que nunca iba a estar ahi.
   *
   * `strictPort` es la otra mitad del arreglo: si el puerto esta ocupado tiene
   * que fallar, no elegir otro sin avisar.
   */
  server: { port: 5176, strictPort: true },
  preview: { port: 5176, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      /**
       * 🔴 Solo `seo.ts`, y no por conformismo.
       *
       * Los componentes de esta app **si** se ejecutan y **si** estan
       * verificados, pero en el paso de `build`: `ssg.test.ts` afirma sobre el
       * HTML que salio del prerender. v8 no puede atribuir esa ejecucion, asi
       * que medirlos daria ~20% y ese numero no significa "sin probar", significa
       * "medido en el lugar equivocado" — y un gate que miente entrena a la gente
       * a bajarlo.
       *
       * Lo que si es logica pura y se importa de verdad es la tabla de metadatos,
       * de la que salen el sitemap y el robots. Esa se mide, y con el gate alto.
       */
      include: ['src/seo.ts'],
      thresholds: { lines: 95, statements: 95, branches: 95, functions: 95 },
    },
  },
});
