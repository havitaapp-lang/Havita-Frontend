import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, assertLocalTarget } from './support/env';

assertLocalTarget(BASE_URL);

/**
 * Havita E2E — Residents modules.
 * Expects the app already running locally (`npm run dev` in Havita-Frontend, backend on :9094).
 * The suite does not start servers itself so it never boots a backend with unknown datasource settings.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  // Tests share one local database; serial workers keep synthetic fixtures from racing each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    viewport: { width: 1366, height: 860 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    // Service worker from vite-plugin-pwa can serve stale bundles between runs.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
