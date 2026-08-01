import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    globalSetup: ['./src/test/globalSetup.ts'],
    // Mỗi test file chạy tuần tự + seed fresh DB riêng (tránh xung đột khi drop database)
    fileParallelism: false,
    env: {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    },
  },
});
