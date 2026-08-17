import { describe, it, expect, beforeEach, vi } from 'vitest';
import { request, signToken } from './utils.js';
import { __setPayOSClient } from '../services/subscription-payos.service.js';

const createUrlMock = vi.fn(async (data: any) => ({
  orderCode: data.orderCode,
  qrCode: 'data:image/png;base64,QR',
  checkoutUrl: `https://pay.payos.vn/${data.orderCode}`,
  paymentLinkId: `pl-${data.orderCode}`,
}));
const verifyMock = vi.fn(async (payload: any) => ({ ...(payload?.data || payload), code: '00' }));

function injectPayOSMock() {
  __setPayOSClient(
    // Hàm constructor hợp lệ cho `new PayOS(...)` → trả về client mock.
    function MockPayOS() {
      return {
        paymentRequests: { create: createUrlMock, cancel: vi.fn() },
        webhooks: { verify: verifyMock },
      };
    },
  );
}
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { encryptKey } from '../configs/constants.js';
import {
  PLATFORM_GATEWAY_TARGET_ID,
} from '../modules/SettingModule/setting.repository.js';

const day = 24 * 3600 * 1000;
const ownerToken = signToken(SEED_IDS.ownerSub.toString(), 'admin', SEED_IDS.tenantSubTrial.toString());
const adminXToken = signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());

/** Seed cổng PayOS hệ thống (scope='platform') để createUrl không lỗi thiếu cấu hình. */
async function seedPlatformGateway() {
  await DB_Connection.Setting.findOneAndUpdate(
    { scope: 'platform', targetId: PLATFORM_GATEWAY_TARGET_ID },
    {
      scope: 'platform',
      targetModel: 'User',
      targetId: PLATFORM_GATEWAY_TARGET_ID,
      paymentMethodType: 'none',
      gateway: {
        payos: {
          clientId: 'gateway-client-1',
          apiKey: encryptKey('gateway-api-secret'),
          checksumKey: encryptKey('gateway-checksum-secret'),
        },
      },
    },
    { upsert: true, new: true },
  );
}

describe('T12 — Thanh toán gói cước bằng PayOS (create-url + webhook)', () => {
  beforeEach(async () => {
    injectPayOSMock();
    await seedPlatformGateway();
    // Khôi phục trạng thái nhà hàng test về active + gói Cơ Bản (chưa thanh toán chu kỳ nào)
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantSubTrial, {
      subscription: 'active',
      currentPlanKey: 'basic',
      paidUntil: undefined,
      pendingPlanKey: undefined,
      pendingCycleMonths: undefined,
    });
    // Xoá mọi giao dịch pending do test trước tạo (orderCode thay đổi theo giờ)
    await DB_Connection.Transaction.deleteMany({
      restaurant: SEED_IDS.tenantSubTrial,
      status: 'pending',
    });
  });

  it('POST /subscriptions/payos/create-url — tạo link cho chủ sở hữu → 200 + pending transaction', async () => {
    const res = await request
      .post('/api/subscriptions/payos/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderCode).toBeDefined();
    expect(res.body.data.transactionId).toBeDefined();
    // checkoutUrl/qrCodeData phụ thuộc lời gọi thật tới PayOS — chỉ check tồn tại nếu API thật.
    if (res.body.data.checkoutUrl) {
      expect(res.body.data.checkoutUrl).toContain('http');
    }

    const tx = await DB_Connection.Transaction.findById(res.body.data.transactionId);
    expect(tx).toBeTruthy();
    expect(tx?.status).toBe('pending');
    expect(tx?.orderCode).toBe(res.body.data.orderCode);
    expect(tx?.amount).toBe(190000);
    expect(tx?.cycleMonths).toBe(1);
    expect(tx?.planKey).toBe('basic');
    expect(tx?.ownerId.toString()).toBe(SEED_IDS.ownerSub.toString());
  });

  it('POST /subscriptions/payos/create-url — tạo link với planId cụ thể → giá theo gói', async () => {
    const res = await request
      .post('/api/subscriptions/payos/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 3, planId: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.data.planKey).toBe('pro');
    const tx = await DB_Connection.Transaction.findById(res.body.data.transactionId);
    expect(tx?.planKey).toBe('pro');
    expect(tx?.cycleMonths).toBe(3);
  });

  it('POST /subscriptions/payos/create-url — không phải chủ sở hữu → 403', async () => {
    const res = await request
      .post('/api/subscriptions/payos/create-url')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 1 });
    expect(res.status).toBe(403);
  });

  it('POST /subscriptions/payos/create-url — chu kỳ không hợp lệ → 400', async () => {
    const res = await request
      .post('/api/subscriptions/payos/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 7 });
    expect(res.status).toBe(400);
  });

  it('POST /subscriptions/payos/create-url — nhà hàng không tồn tại → 404', async () => {
    const res = await request
      .post('/api/subscriptions/payos/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: '65f000000000000000000000', cycleMonths: 1 });
    expect(res.status).toBe(404);
  });

  it('POST /subscriptions/payos/create-url — hạ gói khi còn hạn → lưu pendingPlanKey, không tạo link thanh toán', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantSubTrial, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
      currentPlanKey: 'pro',
      pendingPlanKey: undefined,
      pendingCycleMonths: undefined,
    });
    const res = await request
      .post('/api/subscriptions/payos/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 1, planId: 'basic' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('áp dụng khi hết hạn');
    expect(res.body.data.pendingPlanKey).toBe('basic');
    expect(res.body.data.transactionId).toBeNull();
    const rest = await DB_Connection.Restaurant.findById(SEED_IDS.tenantSubTrial);
    expect(rest?.currentPlanKey).toBe('pro');
    expect(rest?.pendingPlanKey).toBe('basic');
    // Không tạo giao dịch pending nào
    const tx = await DB_Connection.Transaction.exists({
      restaurant: SEED_IDS.tenantSubTrial,
      status: 'pending',
    });
    expect(tx).toBeFalsy();
  });

  it('POST /subscriptions/webhook — không cấu hình gateway → ack 200 + success:false (không crash)', async () => {
    // Xoá gateway để mô phỏng chưa cấu hình
    await DB_Connection.Setting.deleteMany({ scope: 'platform', targetId: PLATFORM_GATEWAY_TARGET_ID });
    const res = await request
      .post('/api/subscriptions/webhook')
      .send({ orderCode: 123456 });
    // Webhook luôn ACK 200 để PayOS không retry liên tục — lỗi tại service.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('POST /subscriptions/webhook — orderCode không tồn tại → ack 200, không crash', async () => {
    const res = await request
      .post('/api/subscriptions/webhook')
      .send({ orderCode: 999999999 });
    expect(res.status).toBe(200);
  });
});
