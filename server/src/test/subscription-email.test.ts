import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { applySubscriptionState, EXPIRING_WARNING_DAYS } from '../services/subscription.service.js';
import { startSMTPSink, decodeQuotedPrintable, type SmtpSink } from './helpers/smtp-sink.js';
import '../jobs/index.js';

const day = 24 * 3600 * 1000;
const ownerId = SEED_IDS.adminX;

/** Tạo nhà hàng mới thuộc chủ adminX với trạng thái cho trước. */
async function seedRestaurant(overrides: Record<string, unknown>) {
  const doc = await DB_Connection.Restaurant.create({
    name: `Nhà hàng ${Math.random().toString(36).slice(2, 8)}`,
    email: 'res@example.com',
    operatingHours: '08:00-22:00',
    ownerId,
    subscription: 'active',
    currentPlanKey: 'pro',
    ...overrides,
  });
  return doc;
}

describe('Email — cảnh báo gói sắp hết hạn (dedupe) & thông báo hạ gói', () => {
  let sink: SmtpSink;

  beforeAll(async () => {
    sink = await startSMTPSink();
    await sink.configure();
  });

  afterAll(async () => {
    await sink.close();
  });

  it('applySubscriptionState: gói sắp hết hạn → email cảnh báo 1 lần, không lặp khi đọc lại', async () => {
    const restaurant = await seedRestaurant({
      paidUntil: new Date(Date.now() + 3 * day),
    });

    // Lần 1 → gửi cảnh báo
    const r1 = await applySubscriptionState(String(restaurant._id));
    expect(r1?.changed).toBe(true);
    expect(sink.received.length).toBe(1);
    expect(sink.received[0]!.to).toContain('admin.test@nhamnhi.vn');
    expect(decodeQuotedPrintable(sink.received[0]!.raw)).toContain('Gói dịch vụ của bạn sắp hết hạn');

    // Lần 2 (đọc lại) → KHÔNG gửi lặp
    await applySubscriptionState(String(restaurant._id));
    expect(sink.received.length).toBe(1);

    // Gia hạn xa → tái lập cờ; hết hạn lại gần → gửi cảnh báo lần 2
    await DB_Connection.Restaurant.findByIdAndUpdate(restaurant._id, {
      paidUntil: new Date(Date.now() + 60 * day),
    });
    await applySubscriptionState(String(restaurant._id));
    await DB_Connection.Restaurant.findByIdAndUpdate(restaurant._id, {
      paidUntil: new Date(Date.now() + 2 * day),
    });
    const r2 = await applySubscriptionState(String(restaurant._id));
    expect(r2?.changed).toBe(true);
    expect(sink.received.length).toBe(2);
  });

  it('applySubscriptionState: gói hết hạn → hạ về Miễn Phí + email thông báo hạ gói', async () => {
    const restaurant = await seedRestaurant({
      paidUntil: new Date(Date.now() - 1 * day),
    });

    const before = sink.received.length;
    const result = await applySubscriptionState(String(restaurant._id));
    expect(result?.changed).toBe(true);
    expect(result?.restaurant.currentPlanKey).toBe('free');

    expect(sink.received.length).toBe(before + 1);
    const msg = sink.received[sink.received.length - 1]!;
    expect(msg.to).toContain('admin.test@nhamnhi.vn');
    const decoded = decodeQuotedPrintable(msg.raw);
    expect(decoded).toContain('Gói dịch vụ đã hạ cấp');
    expect(decoded).toContain('Miễn Phí');
    expect(decoded).toContain('hết hạn');
    expect(decoded).toContain(restaurant.name);
  });

  it('applySubscriptionState: áp dụng pending downgrade cuối chu kỳ → email thông báo hạ gói theo lịch', async () => {
    const restaurant = await seedRestaurant({
      paidUntil: new Date(Date.now() - 1 * day),
      currentPlanKey: 'pro',
      pendingPlanKey: 'basic',
      pendingCycleMonths: 1,
    });

    const before = sink.received.length;
    const result = await applySubscriptionState(String(restaurant._id));
    expect(result?.changed).toBe(true);
    expect(result?.restaurant.currentPlanKey).toBe('basic');
    expect(result?.restaurant.pendingPlanKey).toBeUndefined();

    expect(sink.received.length).toBe(before + 1);
    const decoded = decodeQuotedPrintable(sink.received[sink.received.length - 1]!.raw);
    expect(decoded).toContain('Gói dịch vụ đã hạ cấp');
    expect(decoded).toContain('Cơ Bản');
    expect(decoded).toContain('lịch trình');
  });

  it('applySubscriptionState: gói free còn hạn lâu hơn EXPIRING_WARNING_DAYS → không gửi gì', async () => {
    const restaurant = await seedRestaurant({
      paidUntil: new Date(Date.now() + (EXPIRING_WARNING_DAYS + 1) * day),
    });
    const before = sink.received.length;
    const result = await applySubscriptionState(String(restaurant._id));
    expect(result?.changed).toBe(false);
    expect(sink.received.length).toBe(before);
  });
});