import { defineConfig } from '@playwright/test';

// E2E luôn chạy server test (Mongo Memory Server + seed) trên port riêng 8100
// để không đụng server dev (DB thật) đang chạy trên 8000.
const serverCommand =
  process.env.E2E_SERVER === 'test'
    ? 'PORT=8100 npm --prefix server run start:test'
    : 'PORT=8100 npm --prefix server run dev';

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
      url: 'http://localhost:8100/api/auth/profile/me',
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      command: 'VITE_SERVER_BASE_URL=http://localhost:8100 npm --prefix client run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
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
