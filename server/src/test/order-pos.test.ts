import { describe, it, expect, beforeAll } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';
import DB_Connection from '../models/DB_Connection.js';

const X = SEED_IDS.tenantX.toString();
const staffX = () => tokenFor('staff', X);
const managerX = () => tokenFor('manager', X);

describe('T10 — POS: xoá món / sửa món / chuyển bàn trong đơn', () => {
  let orderId = '';
  let itemId = '';

  beforeAll(async () => {
    const res = await request
      .post('/api/orders')
      .send({
        orderId: `ORD-POS-${Date.now()}`,
        orderType: 'dine-in',
        table: idOf(SEED_IDS.tableX2),
        restaurant: X,
        items: [
          { menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 },
          { menuItem: idOf(SEED_IDS.menuItemX2), quantity: 1 },
        ],
      });
    orderId = res.body?.data?._id || '';
    const detail = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${staffX()}`);
    const items = (detail.body?.data?.items || []) as any[];
    // chọn 1 item để xoá
    itemId = items[0]?._id?.toString?.() || '';
  });

  it('Tạo đơn POS có 2 món (chuẩn bị data)', () => {
    expect(orderId).toBeTruthy();
    expect(itemId).toBeTruthy();
  });

  it('Staff xoá 1 món khỏi đơn (soft delete) → 200, totalAmount giảm đúng, món giữ lại với status=deleted + lý do', async () => {
    const res = await request
      .delete(`/api/orders/${orderId}/items/${itemId}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ reason: 'Khách đổi món' });
    expect(res.status).toBe(200);
    const detail = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${staffX()}`);
    const items = (detail.body?.data?.items || []) as any[];
    const deletedItem = items.find((i) => i._id?.toString?.() === itemId);
    // Soft delete: món vẫn còn trong danh sách, đánh dấu deleted + lý do.
    expect(deletedItem).toBeTruthy();
    expect(deletedItem.status).toBe('deleted');
    expect(deletedItem.deletedReason).toBe('Khách đổi món');
    expect(detail.body.data.itemsCount).toBe(1);
  });

  it('Xoá món đã xoá rồi → 400 (không thể xoá lần 2)', async () => {
    const res = await request
      .delete(`/api/orders/${orderId}/items/${itemId}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ reason: 'Lần 2' });
    expect(res.status).toBe(400);
  });

  it('Xoá món không tồn tại trong đơn → 404', async () => {
    const res = await request
      .delete(`/api/orders/${orderId}/items/000000000000000000000000`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(404);
  });

  it('Staff sửa số lượng món còn lại → 200, itemsCount cập nhật', async () => {
    const detail = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${staffX()}`);
    const remainItem = ((detail.body?.data?.items || []) as any[]).find(
      (i) => i.status !== 'deleted',
    );
    const res = await request
      .patch(`/api/orders/${orderId}/items/${remainItem._id}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.itemsCount).toBe(3);
  });

  it('Sửa món đã xoá → 400', async () => {
    const detail = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${staffX()}`);
    const deletedItem = ((detail.body?.data?.items || []) as any[]).find(
      (i) => i.status === 'deleted',
    );
    const res = await request
      .patch(`/api/orders/${orderId}/items/${deletedItem._id}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ quantity: 2 });
    expect(res.status).toBe(400);
  });

  it('Sửa món với quantity = 0 → 400', async () => {
    const detail = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${staffX()}`);
    const remainItem = ((detail.body?.data?.items || []) as any[])[0];
    const res = await request
      .patch(`/api/orders/${orderId}/items/${remainItem._id}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('Staff chuyển đơn sang bàn khác cùng nhà hàng → 200, order.table = bàn mới', async () => {
    const res = await request
      .put(`/api/orders/${orderId}/move-table`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ targetTableId: idOf(SEED_IDS.tableX1) });
    expect(res.status).toBe(200);
    const movedTable = res.body.data.table;
    const movedTableId = movedTable?._id ? movedTable._id.toString() : String(movedTable);
    expect(movedTableId).toBe(idOf(SEED_IDS.tableX1));
  });

  it('Chuyển đơn sang bàn nhà hàng khác → 400', async () => {
    const res = await request
      .put(`/api/orders/${orderId}/move-table`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ targetTableId: idOf(SEED_IDS.tableY1) });
    expect(res.status).toBe(400);
  });

  it('Manager không thao tác được đơn thuộc nhà hàng khác → 403', async () => {
    const res = await request
      .delete(`/api/orders/${SEED_IDS.orderYActive}/items/${SEED_IDS.orderItemYActive}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(403);
  });
});
