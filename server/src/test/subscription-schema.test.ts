import { describe, it, expect } from 'vitest';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { generateTransactionId } from '../services/transaction-id.service.js';

describe('T1 — Data model subscription', () => {
  it('Restaurant có ownerId + subscription + trialEndsAt + paidUntil', async () => {
    const r = (await DB_Connection.Restaurant.findById(SEED_IDS.tenantX).lean()) as any;
    expect(r).not.toBeNull();
    expect(r!.ownerId?.toString()).toBe(SEED_IDS.adminX.toString());
    expect(r!.subscription).toBe('active');
    expect(r!.paidUntil).toBeInstanceOf(Date);
    expect(r!.trialEndsAt).toBeUndefined();
  });

  it('Restaurant mặc định subscription = trial khi tạo không truyền', async () => {
    const created = await DB_Connection.Restaurant.create({
      name: 'Cơ sở trial',
      email: 'trial@nhamnhi.vn',
      subscription: 'trial',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
    expect(created.subscription).toBe('trial');
    expect(created.trialEndsAt).toBeInstanceOf(Date);
  });

  it('Transaction ghi đủ thông tin thanh toán', async () => {
    const tx = await DB_Connection.Transaction.create({
      restaurant: SEED_IDS.tenantX,
      ownerId: SEED_IDS.adminX,
      transactionId: await generateTransactionId(),
      amount: 299000,
      cycleMonths: 1,
      type: 'restaurant-fee',
      status: 'paid',
      paidUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
    expect(tx.amount).toBe(299000);
    expect(tx.cycleMonths).toBe(1);
    expect(tx.status).toBe('paid');
    expect(tx.transactionId).toMatch(/^\d{14}$/);
  });

  it('PricingConfig có 4 chu kỳ mặc định', async () => {
    await DB_Connection.PricingConfig.updateOne(
      { key: 'default' },
      { $set: { cycles: { 1: 299000, 3: 849000, 6: 1590000, 12: 2990000 }, currency: 'VND' } },
      { upsert: true },
    );
    const pc = (await DB_Connection.PricingConfig.findOne({ key: 'default' }).lean()) as any;
    expect(pc).not.toBeNull();
    expect(pc!.cycles).toMatchObject({ 1: 299000, 3: 849000, 6: 1590000, 12: 2990000 });
    expect(pc!.currency).toBe('VND');
  });
});
