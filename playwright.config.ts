import { defineConfig, devices } from '@playwright/test';

/**
 * When DEPLOY_URL is set (e.g. in post-deploy smoke tests), Playwright targets
 * the deployed environment directly and the local dev server is not started.
 */
const deployUrl = process.env['DEPLOY_URL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: deployUrl || 'http://localhost:4299',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  ...(deployUrl
    ? {}
    : {
        webServer: {
          command: 'npx ng serve --port 4299',
          url: 'http://localhost:4299',
          reuseExistingServer: !process.env['CI'],
          timeout: 120_000,
        },
      }),
});
