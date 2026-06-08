import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'partnerA',
      use: { ...devices['iPhone 15'], browserName: 'chromium' },
    },
    {
      name: 'partnerB',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npx serve . -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
