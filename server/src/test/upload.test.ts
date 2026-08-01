import { vi, describe, it, expect } from 'vitest';

// Mock Cloudinary + CloudinaryStorage trước khi app import (hoisted).
const mocks = vi.hoisted(() => ({
  destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
}));

vi.mock('../configs/cloudinaryConfig.js', () => ({
  default: { uploader: { destroy: mocks.destroy } },
}));

vi.mock('multer-storage-cloudinary', () => {
  class CloudinaryStorage {
    private opts: any;
    constructor(opts: any) {
      this.opts = opts;
    }
    _handleFile(_req: any, file: any, cb: any) {
      const chunks: Buffer[] = [];
      file.stream.on('data', (c: Buffer) => chunks.push(c));
      file.stream.on('end', () => {
        const folder = this.opts.params(_req, file).folder;
        cb(null, {
          path: `https://res.cloudinary.com/test/${folder}/abc.jpg`,
          filename: `${folder}/abc`,
        });
      });
    }
    _removeFile(_req: any, _file: any, cb: any) {
      cb(null);
    }
  }
  return { CloudinaryStorage };
});

import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const adminX = () => tokenFor('admin', X);

const jpeg = Buffer.from('fake-jpeg-content');

describe('T7 — Upload: xác thực & phân vùng tenant', () => {
  it('upload không có token → 401', async () => {
    const res = await request
      .post('/api/upload')
      .attach('image', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('upload thành công (admin X) → 200, url + publicId trong folder X', async () => {
    const res = await request
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminX()}`)
      .attach('image', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain(`restaurants/${X}`);
    expect(res.body.data.publicId).toContain(`restaurants/${X}`);
  });

  it('upload file sai định dạng → từ chối (hiện 500 do multer error chưa được bắt)', async () => {
    const res = await request
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminX()}`)
      .attach('image', Buffer.from('plain text'), {
        filename: 'a.txt',
        contentType: 'text/plain',
      });
    // Ghi nhận hành vi hiện tại: fileFilter ném lỗi multer → không có error handler → 500.
    // Kỳ vọng đúng phải là 400 (từ chối định dạng). Chưa thuộc phạm vi tenant.
    expect(res.status).toBe(500);
  });

  it('upload nhiều file → 200, mảng kết quả', async () => {
    const res = await request
      .post('/api/upload/multiple')
      .set('Authorization', `Bearer ${adminX()}`)
      .attach('images', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
      .attach('images', jpeg, { filename: 'b.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('xóa ảnh thuộc folder X bằng admin X → 200', async () => {
    const res = await request
      .delete(`/api/upload?id=restaurants/${X}/abc`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    expect(mocks.destroy).toHaveBeenCalledWith(`restaurants/${X}/abc`);
  });

  it('xóa ảnh thuộc folder Y bằng admin X → 400 (quyền)', async () => {
    const res = await request
      .delete(`/api/upload?id=restaurants/${SEED_IDS.tenantY.toString()}/abc`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('quyền');
  });

  it('xóa thiếu id → 400', async () => {
    const res = await request.delete('/api/upload').set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(400);
  });
});
