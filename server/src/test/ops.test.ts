import { describe, it, expect } from 'vitest';
import { request } from './utils.js';

// Test CORS theo allowlist trong app.ts: localhost:5173 + 192.168.1.93:5173 + ALLOWED_ORIGINS env.
// Mục tiêu: origin hợp lệ nhận header CORS, origin ngoài allowlist KHÔNG được phép.
describe('CORS — allowlist theo ALLOWED_ORIGINS + local', () => {
  it('Origin http://localhost:5173 (local dev) → được phép', async () => {
    const res = await request.get('/api/restaurants').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('Origin http://192.168.1.93:5173 (test điện thoại) → được phép', async () => {
    const res = await request.get('/api/restaurants').set('Origin', 'http://192.168.1.93:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://192.168.1.93:5173');
  });

  it('Origin https://evil.com (ngoài allowlist) → KHÔNG có header allow-origin', async () => {
    const res = await request.get('/api/restaurants').set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('Preflight OPTIONS từ origin hợp lệ → 204 + allow-origin', async () => {
    const res = await request
      .options('/api/restaurants')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('Endpoint public /api/restaurants vẫn hoạt động bình thường (dùng cho ping giữ tỉnh)', async () => {
    const res = await request.get('/api/restaurants');
    expect(res.status).toBe(200);
  });
});
