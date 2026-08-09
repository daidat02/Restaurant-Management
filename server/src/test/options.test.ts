import { describe, it, expect } from 'vitest';
import { request, idOf, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();

describe('T9 — Topping & ghi chú (optionGroups)', () => {
  it('POST /api/menu/item (manager X) tạo món có optionGroups → lưu đúng', async () => {
    const res = await request
      .post('/api/menu/item')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .send({
        name: 'Trà sữa',
        price: 45000,
        category: idOf(SEED_IDS.categoryX),
        isAvailable: true,
        optionGroups: [
          {
            name: 'Topping',
            type: 'multiple',
            required: false,
            choices: [
              { name: 'Trân châu', price: 5000 },
              { name: 'Thạch', price: 4000 },
            ],
          },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.optionGroups?.[0]?.choices).toHaveLength(2);
  });

  it('POST /api/menu/item với optionGroups sai cấu trúc → 400', async () => {
    const res = await request
      .post('/api/menu/item')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .send({
        name: 'Món lỗi',
        price: 10000,
        category: idOf(SEED_IDS.categoryX),
        isAvailable: true,
        optionGroups: [
          {
            name: 'Topping',
            type: 'multiple',
            required: false,
            choices: [{ name: 'Trân châu', price: -1 }],
          },
        ],
      });
    expect(res.status).toBe(400);
  });

  it('GET /api/menu/items/:restaurantId trả về optionGroups của món seed', async () => {
    const res = await request.get(`/api/menu/items/${X}`);
    expect(res.status).toBe(200);
    const item = (res.body.data || []).find((m: any) => idOf(m._id) === idOf(SEED_IDS.menuItemX1));
    expect(item?.optionGroups?.length).toBeGreaterThan(0);
    expect(item.optionGroups[0].choices.map((c: any) => c.name)).toContain('Trân châu');
  });

  it('POST /api/orders — tổng tiền = giá món + giá topping hợp lệ', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [
        {
          menuItem: idOf(SEED_IDS.menuItemX1),
          quantity: 2,
          toppings: [{ name: 'Trân châu' }, { name: 'Thạch' }],
          note: 'Đá ít',
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe((35000 + 5000 + 4000) * 2);
  });

  it('topping không khớp cấu hình món → bị bỏ qua (chỉ tính topping hợp lệ)', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [
        {
          menuItem: idOf(SEED_IDS.menuItemX1),
          quantity: 1,
          toppings: [{ name: 'Trân châu' }, { name: 'Kim cương' }],
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe(35000 + 5000);
  });

  it('GET /api/orders/:id — items trả về toppings + note đã lưu', async () => {
    const create = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX1),
      orderType: 'dine-in',
      items: [
        {
          menuItem: idOf(SEED_IDS.menuItemX1),
          quantity: 1,
          toppings: [{ name: 'Kem sữa' }],
          note: 'Không đường',
        },
      ],
    });
    expect(create.status).toBe(201);
    const orderId = create.body.data._id;

    const res = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`);
    expect(res.status).toBe(200);
    const item = (res.body.data?.items || [])[0];
    expect(item.toppings?.map((t: any) => t.name)).toContain('Kem sữa');
    expect(item.note).toBe('Không đường');
    expect(item.priceSnapshot).toBe(35000 + 6000);
  });
});
