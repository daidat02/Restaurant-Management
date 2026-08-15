import { describe, it, expect } from 'vitest';
import { request, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';
import DB_Connection from '../models/DB_Connection.js';

// Import barrel để đăng ký job handler (new-order, create-notification) — đảm bảo
// addJob chạy INLINE khi Redis off, giống production khi queue không ready.
import '../jobs/index.js';

const X = SEED_IDS.tenantX.toString();

describe('T03 — Queue order-fanout: create/add-item → socket + notification + orderCount (Redis off → inline)', () => {
  it('Tạo đơn → tạo notification new_order + tăng orderCount của món (inline)', async () => {
    const before = await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX1);
    expect(before?.orderCount ?? 0).toBe(0);

    const createRes = await request.post('/api/orders').send({
      orderId: `ORD-FANOUT-CREATE-${Date.now()}`,
      orderType: 'dine-in',
      table: idOf(SEED_IDS.tableX2),
      restaurant: X,
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 2 }],
    });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body?.data?._id || '';
    expect(orderId).toBeTruthy();

    // (c) orderCount tăng đúng quantity
    const after = await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX1);
    expect(after?.orderCount).toBe(2);

    // (b) notification new_order lưu vào đúng tenant
    const noti = await DB_Connection.Notification.findOne({
      restaurant: SEED_IDS.tenantX,
      type: 'new_order',
    }).sort({ createdAt: -1 });
    expect(noti).toBeTruthy();
    expect(String(noti?.data?._id)).toBe(orderId);
  });

  it('Add-item → chỉ tăng orderCount cho MÓN MỚI (không đếm lại món cũ)', async () => {
    const createRes = await request.post('/api/orders').send({
      orderId: `ORD-FANOUT-ADD-${Date.now()}`,
      orderType: 'dine-in',
      table: idOf(SEED_IDS.tableX2),
      restaurant: X,
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    const orderId = createRes.body?.data?._id || '';

    const baseX1 = (await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX1))?.orderCount ?? 0;
    const baseX2 = (await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX2))?.orderCount ?? 0;

    const addRes = await request.post('/api/orders/add-item').send({
      orderId,
      items: [{ menuItem: idOf(SEED_IDS.menuItemX2), quantity: 3 }],
    });
    expect(addRes.status).toBe(200);

    // menuItemX2 (món mới thêm) tăng đúng, menuItemX1 KHÔNG bị đếm lại
    const afterX1 = (await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX1))?.orderCount ?? 0;
    const afterX2 = (await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX2))?.orderCount ?? 0;
    expect(afterX1).toBe(baseX1);
    expect(afterX2).toBe(baseX2 + 3);

    // Notification add-item cũng được tạo (message riêng)
    const noti = await DB_Connection.Notification.findOne({
      restaurant: SEED_IDS.tenantX,
      type: 'new_order',
      message: 'Đơn Hàng Có Sự Thay Đổi. Vui Lòng Kiểm Tra Chi Tiết',
    }).sort({ createdAt: -1 });
    expect(noti).toBeTruthy();
  });

  it('Tạo đơn thất bại/không hợp lệ → không fan-out (không notification, không orderCount)', async () => {
    const before = (await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX1))?.orderCount ?? 0;
    const notiBefore = await DB_Connection.Notification.countDocuments({
      restaurant: SEED_IDS.tenantX,
      type: 'new_order',
    });

    const res = await request.post('/api/orders').send({
      orderId: `ORD-FANOUT-INVALID-${Date.now()}`,
      orderType: 'dine-in',
      // thiếu table → 400 trước commit
      restaurant: X,
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    expect(res.status).toBe(400);

    const after = (await DB_Connection.MenuItem.findById(SEED_IDS.menuItemX1))?.orderCount ?? 0;
    expect(after).toBe(before);
    const notiAfter = await DB_Connection.Notification.countDocuments({
      restaurant: SEED_IDS.tenantX,
      type: 'new_order',
    });
    expect(notiAfter).toBe(notiBefore);
  });
});