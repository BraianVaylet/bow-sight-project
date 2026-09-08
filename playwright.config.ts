import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de los caminos criticos.
 *
 * Corre contra un Mongo EFIMERO que se crea y se tira (`e2e/support/api-server.ts`).
 * Nunca contra staging ni contra produccion: estos tests escriben.
 */
export default defineConfig({
  testDir: './e2e',
  // Los caminos criticos comparten la base efimera: en paralelo se pisan.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  projects: [
    // La PWA se usa en el campo de tiro, en un telefono. El proyecto mobile no
    // es un extra: es el caso principal.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx e2e/support/api-server.ts',
      url: 'http://localhost:3000/ready',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @bow-sight/pwa dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @bow-sight/landing dev',
      url: 'http://localhost:5176',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
