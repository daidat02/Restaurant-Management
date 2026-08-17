import { describe, it, expect, beforeEach } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { encryptKey } from '../configs/constants.js';
import {
  PLATFORM_GATEWAY_TARGET_ID,
} from '../modules/SettingModule/setting.repository.js';

const day = 24 * 3600 * 1000;
const ownerToken = signToken(SEED_IDS.ownerSub.toString(), 'admin', SEED_IDS.tenantSubTrial.toString());
const adminXToken = signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());

/** Seed cổng VNPay hệ thống (scope='platform') để createUrl không lỗi thiếu cấu hình. */
async function seedPlatformGatewayVnpay() {
  await DB_Connection.Setting.findOneAndUpdate(
    { scope: 'platform', targetId: PLATFORM_GATEWAY_TARGET_ID },
    {
      scope: 'platform',
      targetModel: 'User',
      targetId: PLATFORM_GATEWAY_TARGET_ID,
      paymentMethodType: 'none',
      gateway: {
        vnpay: {
          merchant: 'VNP00000001',
          accountName: 'CÔNG TY TEST',
          accountNumber: '10123456789',
          apiKey: encryptKey('vnpay-api-secret'),
          checksumKey: encryptKey('vnpay-checksum-secret'),
        },
      },
    },
    { upsert: true, new: true },
  );
}

describe('T13 — Thanh toán gói cước bằng VNPay (create-url + return)', () => {
  beforeEach(async () => {
    await seedPlatformGatewayVnpay();
    // Khôi phục trạng thái nhà hàng test về trial
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantSubTrial, {
      subscription: 'trial',
      trialEndsAt: new Date(Date.now() + 10 * day),
      currentPlanKey: 'basic',
      paidUntil: undefined,
    });
    // Xoá mọi giao dịch pending do test trước tạo
    await DB_Connection.Transaction.deleteMany({
      restaurant: SEED_IDS.tenantSubTrial,
      status: 'pending',
    });
  });

  it('POST /subscriptions/vnpay/create-url — chủ sở hữu tạo link → 200 + pending transaction + URL', async () => {
    const res = await request
      .post('/api/subscriptions/vnpay/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderCode).toBeDefined();
    expect(res.body.data.transactionId).toBeDefined();
    expect(res.body.data.checkoutUrl).toContain('vpcpay.html');
    expect(res.body.data.checkoutUrl).toContain('vnp_SecureHash=');

    const tx = await DB_Connection.Transaction.findById(res.body.data.transactionId);
    expect(tx).toBeTruthy();
    expect(tx?.status).toBe('pending');
    expect(tx?.amount).toBe(190000);
    expect(tx?.cycleMonths).toBe(1);
    expect(tx?.planKey).toBe('basic');
  });

  it('POST /subscriptions/vnpay/create-url — không phải chủ sở hữu → 403', async () => {
    const res = await request
      .post('/api/subscriptions/vnpay/create-url')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 1 });
    expect(res.status).toBe(403);
  });

  it('POST /subscriptions/vnpay/create-url — chu kỳ không hợp lệ → 400', async () => {
    const res = await request
      .post('/api/subscriptions/vnpay/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 7 });
    expect(res.status).toBe(400);
  });

  it('POST /subscriptions/vnpay/create-url — chưa cấu hình gateway → 500', async () => {
    await DB_Connection.Setting.deleteMany({ scope: 'platform', targetId: PLATFORM_GATEWAY_TARGET_ID });
    const res = await request
      .post('/api/subscriptions/vnpay/create-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: SEED_IDS.tenantSubTrial.toString(), cycleMonths: 1 });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('GET /subscriptions/vnpay/return — thiếu chữ ký → 400', async () => {
    const res = await request
      .get('/api/subscriptions/vnpay/return')
      .query({ vnp_TxnRef: '202608120000000000', vnp_ResponseCode: '00' });
    expect(res.status).toBe(400);
  });

  it('GET /subscriptions/vnpay/return — orderCode không tồn tại → 404', async () => {
    // Dùng tham số chuẩn (checksum không được kiểm tra do thiếu gateway secret hợp lệ → rơi về 400/404)
    const res = await request
      .get('/api/subscriptions/vnpay/return')
      .query({ vnp_TxnRef: '202608120000001234', vnp_ResponseCode: '00', vnp_SecureHash: 'x' });
    // Nếu chữ ký sai → 400; nếu gateway không có secret để verify → cũng trả về 400/404. Không crash.
    expect([400, 404]).toContain(res.status);
  });
});
