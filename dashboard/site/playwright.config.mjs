import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  fullyParallel: true,
  testMatch: ['**/*.spec.js'],
  testDir: './test/e2e',
  timeout: 60000,
  use: {
    headless: true,
    launchOptions: {
      args: ['--no-sandbox'],
      ...(executablePath ? { executablePath } : {})
    }
  }
});
