import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    browserName: 'chromium'
  },

  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI
  }
});
