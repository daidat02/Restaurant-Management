/**
 * MIGRATION (chạy 1 lần): Chuyển dữ liệu thuê bao hiện tại sang mô hình 4 gói + vòng đời mới.
 *
 * Cách chạy:
 *   1. Build:  npm run build  (hoặc npx tsc)
 *   2. Chạy:   node dist/scripts/migrate-subscription-plans.js
 *
 * Luật "grandfather" (khớp issues/04-migration-seed.md):
 *   - `subscription='trial'`        → active + currentPlanKey='free', xoá trialEndsAt + paidUntil.
 *   - `subscription='active'` + gói trả phí (basic/pro/enterprise...) → GIỮ NGUYÊN (grandfather).
 *   - `subscription='active'` + thiếu currentPlanKey → gán currentPlanKey='free'.
 *   - `subscription='locked'`       → active + free (luật mới "hết hạn → free"; locked cũ đều do hết hạn, không có khoá thủ công).
 *   - `subscription='pending'`      → giữ nguyên.
 *
 * Idempotent: chạy lại nhiều lần → không thay đổi gì thêm.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';
import DB_Connection from '../models/DB_Connection.js';
import { DEFAULT_PLANS } from '../models/Schema/PricingConfigSchema.js';

const FREE_PLAN_KEY = 'free';

const log = (step: string, detail = '') => {
  console.log(`[migrate-subscription-plans] ${step}${detail ? ` — ${detail}` : ''}`);
};

/** Xác định gói "trả phí" từ PricingConfig (fallback DEFAULT_PLANS). */
async function getPaidPlanKeys(): Promise<Set<string>> {
  const config = (await DB_Connection.PricingConfig.findOne({ key: 'default' }).lean()) as any;
  const plans = (config?.plans && (config.plans as any[]).length > 0 ? config.plans : DEFAULT_PLANS) as any[];
  const keys = new Set<string>(
    plans
      .filter((p) => p && p.isActive !== false && p.contactOnly !== true && Number(p.priceMonthly) > 0)
      .map((p) => p.key),
  );
  return keys;
}

/** Toàn bộ logic migration — tách riêng để test chạy được trên Mongo Memory Server. */
export async function migrateSubscriptionPlans(): Promise<{
  total: number;
  changes: { id: string; name: string; from: string; to: string }[];
}> {
  const paidPlanKeys = await getPaidPlanKeys();
  const changes: { id: string; name: string; from: string; to: string }[] = [];
  const restaurants = await DB_Connection.Restaurant.find({}).lean();

  for (const r of restaurants as any[]) {
    const id = String(r._id);
    const sub = r.subscription as string;
    const plan = r.currentPlanKey as string | undefined;
    const was = sub === 'trial' ? `trial(${plan ?? '-'})` : `${sub}(${plan ?? '-'})`;

    if (sub === 'trial') {
      await DB_Connection.Restaurant.updateOne(
        { _id: r._id },
        { $set: { subscription: 'active', currentPlanKey: FREE_PLAN_KEY }, $unset: { trialEndsAt: 1, paidUntil: 1 } },
      );
      changes.push({ id, name: r.name, from: was, to: `active(${FREE_PLAN_KEY})` });
    } else if (sub === 'active' && plan && paidPlanKeys.has(plan)) {
      // grandfather — giữ nguyên
    } else if (sub === 'active' && plan === FREE_PLAN_KEY) {
      // đã là gói Miễn Phí — không làm gì (giữ idempotent)
    } else if (sub === 'active') {
      // thiếu currentPlanKey hoặc gói không còn tồn tại → gán free
      await DB_Connection.Restaurant.updateOne(
        { _id: r._id },
        { $set: { subscription: 'active', currentPlanKey: FREE_PLAN_KEY } },
      );
      changes.push({ id, name: r.name, from: was, to: `active(${FREE_PLAN_KEY})` });
    } else if (sub === 'locked') {
      await DB_Connection.Restaurant.updateOne(
        { _id: r._id },
        { $set: { subscription: 'active', currentPlanKey: FREE_PLAN_KEY }, $unset: { paidUntil: 1 } },
      );
      changes.push({ id, name: r.name, from: was, to: `active(${FREE_PLAN_KEY})` });
    }
    // pending → giữ nguyên
  }

  await DB_Connection.Restaurant.ensureIndexes();
  return { total: changes.length, changes };
}

const main = async () => {
  dotenv.config();
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong .env');

  await mongoose.connect(uri);
  log('CONNECT', 'OK');

  const { total, changes } = await migrateSubscriptionPlans();

  const remainingTrial = await DB_Connection.Restaurant.countDocuments({ subscription: 'trial' });
  const remainingLocked = await DB_Connection.Restaurant.countDocuments({ subscription: 'locked' });
  const activeNoPlan = await DB_Connection.Restaurant.countDocuments({
    subscription: 'active',
    $or: [{ currentPlanKey: { $exists: false } }, { currentPlanKey: null }, { currentPlanKey: '' }],
  });

  log('VERIFY', `còn trial: ${remainingTrial}; còn locked: ${remainingLocked}; active thiếu gói: ${activeNoPlan}`);
  log('SUMMARY', `đã migrate ${total} nhà hàng`);
  for (const c of changes) {
    log('CHANGED', `${c.id} "${c.name}": ${c.from} → ${c.to}`);
  }

  await mongoose.disconnect();
  log('DONE', 'migration hoàn tất');
};

// Chỉ chạy khi thực thi trực tiếp (node dist/scripts/...), không chạy khi được import để test.
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((err) => {
    console.error('[migrate-subscription-plans] LỖI:', err);
    process.exit(1);
  });
}
