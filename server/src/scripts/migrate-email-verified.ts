/**
 * MIGRATION (chạy 1 lần): Backfill `emailVerified:true` cho toàn bộ user hiện có.
 *
 * Lý do: sau khi bật xác thực email OTP ở đăng ký owner (login-gate `EMAIL_NOT_VERIFIED`),
 * các user tồn tại TRƯỚC thời điểm này (seed, owner, staff, manager, customer) chưa từng
 * xác thực email → nếu không backfill sẽ bị chặn đăng nhập.
 *
 * Cách chạy:
 *   1. Build:  npm run build  (hoặc npx tsc)
 *   2. Chạy:   node dist/scripts/migrate-email-verified.js
 *
 * Idempotent: chạy lại nhiều lần → không thay đổi gì thêm (chỉ set user đang `emailVerified !== true`).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';
import DB_Connection from '../models/DB_Connection.js';

const log = (step: string, detail = '') => {
  console.log(`[migrate-email-verified] ${step}${detail ? ` — ${detail}` : ''}`);
};

/** Toàn bộ logic migration — tách riêng để test chạy được trên Mongo Memory Server. */
export async function migrateEmailVerified(): Promise<{
  total: number;
  updated: number;
}> {
  const updated = await DB_Connection.User.updateMany(
    { emailVerified: { $ne: true } },
    { $set: { emailVerified: true, emailVerifiedAt: new Date() } },
  );
  await DB_Connection.User.ensureIndexes();
  return { total: updated.modifiedCount, updated: updated.modifiedCount };
}

const main = async () => {
  dotenv.config();
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong .env');

  await mongoose.connect(uri);
  log('CONNECT', 'OK');

  const { updated } = await migrateEmailVerified();

  const remainingUnverified = await DB_Connection.User.countDocuments({
    emailVerified: { $ne: true },
  });

  log('VERIFY', `còn user chưa verify: ${remainingUnverified}`);
  log('SUMMARY', `đã backfill ${updated} user lên emailVerified=true`);

  await mongoose.disconnect();
  log('DONE', 'migration hoàn tất');
};

// Chỉ chạy khi thực thi trực tiếp (node dist/scripts/...), không chạy khi được import để test.
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((err) => {
    console.error('[migrate-email-verified] LỖI:', err);
    process.exit(1);
  });
}