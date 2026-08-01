import { defineConfig } from '@playwright/test';

// CI chạy server test (Mongo Memory Server + seed) thay vì server dev (DB thật)
const serverCommand =
  process.env.E2E_SERVER === 'test'
    ? 'npm --prefix server run start:test'
    : 'npm --prefix server run dev';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    locale: 'vi-VN',
  },
  webServer: [
    {
      command: serverCommand,
      url: 'http://localhost:8000/api/auth/profile/me',
      reuseExistingServer: true,
      timeout: 90_000,
    },
    {
      command: 'npm --prefix client run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
