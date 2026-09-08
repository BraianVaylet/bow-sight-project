import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // `prompt` y no `autoUpdate`: recargar sola mientras el arquero anota una
      // marca entre dos tandas le haria perder lo que estaba escribiendo.
      registerType: 'prompt',
      injectRegister: 'auto',
      // El service worker fuera del build de produccion: en dev solo estorba.
      devOptions: { enabled: false },
      manifest: {
        name: 'Bow Sight',
        short_name: 'Bow Sight',
        description: 'Las marcas de mira de tu arco, siempre a mano.',
        // Neutral de idioma: el manifest solo puede tener uno, y el prompt de
        // instalacion es una superficie de una sola vez (ADR-005).
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf9f7',
        theme_color: '#faf9f7',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Se usa en el campo de tiro, sin señal: los GET se sirven de cache
            // cuando la red no contesta. Las mutaciones nunca se cachean; su
            // cola de escritura llega en F3.
            urlPattern: /^.*\/api\/v1\/.*$/,
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Si el puerto esta ocupado tiene que fallar: corrido a otro, el proxy de
    // abajo sigue funcionando pero nadie lo encuentra donde lo busca.
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        // Un `createApiClient` a nivel de modulo: no tiene rama que cubrir, y
        // esta stubeado en todos los tests.
        'src/app/api.ts',
        // Depende de `virtual:pwa-register/react`, que solo existe con el
        // plugin de PWA corriendo. Se verifica instalando la app, no en jsdom.
        'src/app/UpdatePrompt.tsx',
      ],
      // Reflejan lo que la app ya tiene cubierto. Un gate muy por debajo de la
      // realidad no protege nada: deja bajar la cobertura sin que nadie lo note.
      thresholds: { lines: 90, statements: 90, branches: 75, functions: 90 },
    },
  },
});
