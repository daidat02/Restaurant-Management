import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockClient, mockState } = vi.hoisted(() => {
  const mockClient = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
  };
  const mockState = { ready: true };
  return { mockClient, mockState };
});

vi.mock('../configs/redis.js', () => {
  return {
    isRedisReady: vi.fn(() => mockState.ready),
    getRedisClient: vi.fn(() => mockClient),
  };
});

import { getCache, getOrSetCache, invalidateCache, toPlainJson } from './cache.service.js';

describe('cache.service — wrapper cache generic', () => {
  beforeEach(() => {
    mockState.ready = true;
    vi.clearAllMocks();
    mockClient.get.mockResolvedValue(null);
    mockClient.set.mockResolvedValue('OK');
    mockClient.del.mockResolvedValue(1);
    mockClient.scan.mockResolvedValue(['0', []]);
  });

  // ============ getCache ============
  describe('getCache', () => {
    it('trả null khi Redis không ready (fallback, không gọi redis)', async () => {
      mockState.ready = false;
      const result = await getCache('menu:a');
      expect(result).toBeNull();
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('hit: trả dữ liệu parse từ JSON', async () => {
      mockClient.get.mockResolvedValue('{"categories":[], "items":[1,2]}');
      const result = await getCache('menu:a');
      expect(result).toEqual({ categories: [], items: [1, 2] });
    });

    it('không có key → trả null', async () => {
      const result = await getCache('menu:a');
      expect(result).toBeNull();
    });

    it('JSON lỗi → trả null (coi như miss)', async () => {
      mockClient.get.mockResolvedValue('{không phải json');
      const result = await getCache('menu:a');
      expect(result).toBeNull();
    });

    it('GET redis thất bại → trả null (fallback, không throw)', async () => {
      mockClient.get.mockRejectedValue(new Error('connection lost'));
      const result = await getCache('menu:a');
      expect(result).toBeNull();
    });
  });

  // ============ getOrSetCache ============
  describe('getOrSetCache', () => {
    it('miss: chạy fallbackAsyncFn rồi SET kèm TTL', async () => {
      const fallback = vi.fn(async () => ({ items: ['x'] }));
      const result = await getOrSetCache('menu:a', fallback, 300);

      expect(fallback).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ items: ['x'] });
      expect(mockClient.set).toHaveBeenCalledWith(
        'menu:a',
        '{"items":["x"]}',
        'EX',
        300,
      );
    });

    it('hit: trả dữ liệu cache, KHÔNG chạy fallback, KHÔNG set lại', async () => {
      mockClient.get.mockResolvedValue('{"items":["cached"]}');
      const fallback = vi.fn(async () => ({ items: ['db'] }));

      const result = await getOrSetCache('menu:a', fallback, 300);

      expect(result).toEqual({ items: ['cached'] });
      expect(fallback).not.toHaveBeenCalled();
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('Redis TẮT: chạy fallback nhưng KHÔNG ghi cache', async () => {
      mockState.ready = false;
      const fallback = vi.fn(async () => ({ items: ['db'] }));

      const result = await getOrSetCache('menu:a', fallback, 300);

      expect(result).toEqual({ items: ['db'] });
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('GET lỗi (redis down): vẫn chạy fallback và không throw', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const fallback = vi.fn(async () => ({ items: ['db'] }));

      const result = await getOrSetCache('menu:a', fallback, 300);

      expect(result).toEqual({ items: ['db'] });
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('SET lỗi (ghi thất bại): không throw, vẫn trả kết quả fallback', async () => {
      mockClient.set.mockRejectedValue(new Error('OOM'));
      const fallback = vi.fn(async () => ({ items: ['db'] }));

      const result = await getOrSetCache('menu:a', fallback, 300);

      expect(result).toEqual({ items: ['db'] });
    });

    it('fallback (DB) throw: lan truyền lỗi nghiệp vụ (không nuốt)', async () => {
      const fallback = vi.fn(async () => {
        throw new Error('DB down');
      });
      await expect(getOrSetCache('menu:a', fallback, 300)).rejects.toThrow('DB down');
    });
  });

  // ============ invalidateCache ============
  describe('invalidateCache', () => {
    it('key thường → DEL đúng key', async () => {
      await invalidateCache('menu:a');
      expect(mockClient.del).toHaveBeenCalledWith('menu:a');
    });

    it('pattern chứa * → SCAN + DEL từng batch', async () => {
      mockClient.scan.mockResolvedValueOnce(['0', ['menu:a', 'menu:b']]);
      await invalidateCache('menu:*');
      expect(mockClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'menu:*', 'COUNT', 100);
      expect(mockClient.del).toHaveBeenCalledWith('menu:a', 'menu:b');
    });

    it('pattern NHIỀU trang → scan iterate đến cursor "0"', async () => {
      mockClient.scan
        .mockResolvedValueOnce(['10', ['menu:1']])
        .mockResolvedValueOnce(['0', ['menu:2']]);
      await invalidateCache('menu:*');
      expect(mockClient.scan).toHaveBeenCalledTimes(2);
      expect(mockClient.del).toHaveBeenCalledWith('menu:1');
      expect(mockClient.del).toHaveBeenCalledWith('menu:2');
    });

    it('Redis TẮT → no-op, không gọi DEL, không lỗi', async () => {
      mockState.ready = false;
      await invalidateCache('menu:a');
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('SCAN/DEL lỗi → không throw', async () => {
      mockClient.del.mockRejectedValue(new Error('connection lost'));
      await expect(invalidateCache('menu:a')).resolves.toBeUndefined();
    });
  });

  describe('toPlainJson', () => {
    it('round-trip qua JSON: dùng toJSON nếu có, khử function/metadata', () => {
      const fakeMongooseDoc = {
        __v: 0,
        name: 'Phở',
        toJSON: () => ({ _id: 'abc', name: 'Phở' }),
      };
      const plain = toPlainJson(fakeMongooseDoc);
      expect(plain).toEqual({ _id: 'abc', name: 'Phở' });
    });
  });
});