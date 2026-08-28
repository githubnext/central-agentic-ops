import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: ['**/*.spec.js'],
  testDir: './test/e2e',
  timeout: 30000,
  use: {
    headless: true,
    launchOptions: {
      args: ['--no-sandbox']
    }
  }
});
