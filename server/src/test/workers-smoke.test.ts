import { describe, it, expect } from 'vitest';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { startWorkers, closeWorkers } from '../queues/workers.js';

interface SmokeResult {
  code: number;
  stdout: string;
  stderr: string;
}

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

describe('T04 — Smoke: startWorkers không crash khi Redis down', () => {
  it('ENABLE_REDIS=false (test env) → startWorkers bỏ qua, trả 0 worker, không throw', async () => {
    const count = await startWorkers();
    expect(count).toBe(0);
  });

  it('closeWorkers với danh sách rỗng → resolve (shutdown an toàn)', async () => {
    await expect(closeWorkers()).resolves.toBeUndefined();
  });

  it('ENABLE_REDIS=true + REDIS_URL sai (built dist) → boot không crash, startWorkers fallback an toàn', async () => {
    // Chạy 1 process con với built dist (đã `npm run build`) để env đọc ĐÚNG lúc import —
    // giống production boot: connection sẽ cố connect Redis sai rồi rơi về inline fallback.
    const script = `
      const { initQueueRedis, shutdownQueueRedis } = await import('./dist/queues/connection.js');
      const { startWorkers, closeWorkers } = await import('./dist/queues/workers.js');
      initQueueRedis();
      const count = await startWorkers();
      console.log('WORKERS=' + count);
      await closeWorkers();
      shutdownQueueRedis();
    `;
    const built = path.join(ROOT, 'dist', 'index.js');
    if (!(await statExists(built))) {
      console.warn('[smoke] dist chưa build — bỏ qua child-process smoke');
      return;
    }

    const out = await new Promise<SmokeResult>((resolve) => {
      execFile(
        process.execPath,
        ['--input-type=module', '--eval', script],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            ENABLE_REDIS: 'true',
            REDIS_URL: 'redis://127.0.0.1:9', // cổng không có gì → không connect được
            NODE_ENV: 'test',
          },
          timeout: 15000,
        },
        (error, stdout, stderr) => {
          const code = typeof error?.code === 'number' ? error.code : error ? 1 : 0;
          resolve({ code, stdout, stderr });
        },
      );
    });

    // Không crash (exit code 0) + worker KHÔNG khởi động (vì Redis không 'ready').
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('WORKERS=0');
  });
});

function statExists(p: string): Promise<boolean> {
  return import('fs/promises').then((fs) => fs.stat(p).then(() => true, () => false));
}