import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173/';
const run = process.env.QA_RUN || 'local-mock';
export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0, // Live API failures must not produce automatic repeat requests.
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['json', { outputFile: `qa-results/${run}/results.json` }], ['html', { outputFolder: `qa-results/${run}/html`, open: 'never' }]],
  outputDir: `qa-results/${run}/artifacts`,
  use: { baseURL, acceptDownloads: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', testIgnore: '**/live.spec.js', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', testIgnore: '**/live.spec.js', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
    { name: 'live', testMatch: '**/live.spec.js', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'node scripts/serve.mjs', url: baseURL, reuseExistingServer: false, timeout: 15000 }
});
