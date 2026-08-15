import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';
import menuRepository from '../modules/MenuModule/menu.repository.js';

const X = idOf(SEED_IDS.tenantX);

describe('Menu cache — Redis enabled/disabled (integration)', () => {
  beforeEach(() => {
    mockState.ready = true;
    vi.clearAllMocks();
    mockClient.get.mockResolvedValue(null);
    mockClient.set.mockResolvedValue('OK');
    mockClient.del.mockResolvedValue(1);
    mockClient.scan.mockResolvedValue(['0', []]);
    // Không spy repository — mỗi test đếm truy vấn DB bằng spyOn riêng
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Redis TẮT: GET menu vẫn trả dữ liệu DB (fallback), không gọi redis', async () => {
    mockState.ready = false;
    const res = await request.get(`/api/menu/items/${X}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBeTruthy();
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(mockClient.set).not.toHaveBeenCalled();
  });

  it('Redis miss: fallback query DB + SET composite kèm TTL; GET sau là cache hit (không query lại DB)', async () => {
    const findItemsSpy = vi.spyOn(menuRepository, 'findItems');
    const findCatSpy = vi.spyOn(menuRepository, 'findAllMenuCatWithCount');

    // Lần 1: miss → fallback DB + set composite vào redis
    const first = await request.get(`/api/menu/items/${X}`);
    expect(first.status).toBe(200);
    expect(findItemsSpy).toHaveBeenCalledTimes(1);
    const compositeKey = `menu:${X}`;
    expect(mockClient.set).toHaveBeenCalledWith(
      compositeKey,
      expect.stringContaining('"items"'),
      'EX',
      300,
    );

    // Lần 2: redis có dữ liệu → hit, KHÔNG query lại DB
    mockClient.get.mockResolvedValueOnce(
      JSON.stringify({
        categories: [],
        items: [
          {
            _id: 'cachedid1',
            name: 'Món cached 1',
            price: 111,
            isAvailable: true,
            restaurant: X,
            category: { _id: idOf(SEED_IDS.categoryX), name: 'Đồ uống' },
          },
        ],
      }),
    );
    const second = await request.get(`/api/menu/items/${X}`);
    expect(second.status).toBe(200);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.data[0].name).toBe('Món cached 1');
    expect(findItemsSpy).toHaveBeenCalledTimes(1); // không tăng — đọc từ cache
  });

  it('Cache hit: endpoint available derive từ composite (filter isAvailable)', async () => {
    mockClient.get.mockResolvedValue(
      JSON.stringify({
        categories: [],
        items: [
          {
            _id: 'a',
            name: 'Đang bán',
            price: 100,
            isAvailable: true,
            restaurant: X,
            category: { _id: idOf(SEED_IDS.categoryX), name: 'Đồ uống' },
          },
          {
            _id: 'b',
            name: 'Ẩn khỏi menu',
            price: 200,
            isAvailable: false,
            restaurant: X,
            category: { _id: idOf(SEED_IDS.categoryX), name: 'Đồ uống' },
          },
        ],
      }),
    );
    const res = await request.get(`/api/menu/item/available/${X}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Đang bán');
  });

  it('Cache hit: endpoint category trả categories từ composite', async () => {
    mockClient.get.mockResolvedValue(
      JSON.stringify({
        categories: [
          { _id: idOf(SEED_IDS.categoryX), name: 'Đồ uống', foodCount: 5 },
        ],
        items: [],
      }),
    );
    const res = await request.get(`/api/menu/category/${X}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].foodCount).toBe(5);
  });

  it('Sau khi tạo món (POST): invalidate del key menu:{restaurantId}', async () => {
    const before = await request.get(`/api/menu/items/${X}`);
    expect(before.status).toBe(200);

    const token = tokenFor('manager', X);
    const res = await request
      .post('/api/menu/item')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bún chả cache',
        price: 39000,
        category: idOf(SEED_IDS.categoryX),
      });
    expect(res.status).toBe(201);

    expect(mockClient.del).toHaveBeenCalledWith(`menu:${X}`);
  });

  it('Sau khi toggle availability (PUT availability): invalidate del key menu:{restaurantId}', async () => {
    const token = tokenFor('manager', X);
    const res = await request
      .put(`/api/menu/item/${idOf(SEED_IDS.menuItemX1)}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAvailable: false });
    expect(res.status).toBe(200);

    expect(mockClient.del).toHaveBeenCalledWith(`menu:${X}`);
  });

  it('Redis TẮT: write menu vẫn thành công, invalidate no-op (không gọi del)', async () => {
    mockState.ready = false;
    const token = tokenFor('manager', X);
    const res = await request
      .put(`/api/menu/item/${idOf(SEED_IDS.menuItemX1)}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAvailable: false });
    expect(res.status).toBe(200);
    expect(mockClient.del).not.toHaveBeenCalled();
  });
});