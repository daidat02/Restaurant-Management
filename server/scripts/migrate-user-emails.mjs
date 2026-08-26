/**
 * MIGRATION (DB thật): Đổi email user từ @nhamnhi.vn → @nhahangos.me và
 * backfill emailVerified=true cho toàn bộ user (idempotent).
 *
 * An toàn:
 *  - Chỉ đổi user có email kết thúc bằng @nhamnhi.vn (không phân biệt hoa thường).
 *  - Kiểm tra trùng: nếu email mới đã tồn tại cho user khác → bỏ qua và ghi log.
 *  - Hỗ trợ --dry-run: chỉ thống kê, không ghi.
 *
 * Cách chạy:
 *    node server/scripts/migrate-user-emails.mjs            # ghi thật
 *    node server/scripts/migrate-user-emails.mjs --dry-run  # chỉ thống kê
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const OLD_DOMAIN = '@nhamnhi.vn';
const NEW_DOMAIN = '@nhahangos.me';
const DRY_RUN = process.argv.includes('--dry-run');

const log = (step, detail = '') =>
  console.log(`[migrate-user-emails] ${step}${detail ? ` — ${detail}` : ''}`);

function toNewEmail(email) {
  return email.replace(/@nhamnhi\.vn$/i, NEW_DOMAIN);
}

const main = async () => {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong .env');

  await mongoose.connect(uri);
  log('CONNECT', 'OK' + (DRY_RUN ? ' (DRY-RUN)' : ''));

  const db = mongoose.connection;
  const users = db.collection('users');

  const candidates = await users
    .find({ email: { $regex: /@nhamnhi\.vn$/i } })
    .project({ email: 1 })
    .toArray();

  log('SCAN', `tìm thấy ${candidates.length} user có email ${OLD_DOMAIN}`);

  // Lấy toàn bộ email hiện có để phát hiện trùng lặp khi đổi domain.
  const allEmails = new Set(
    (await users.find({}).project({ email: 1 }).toArray()).map((u) => u.email),
  );

  let renamed = 0;
  let skippedCollision = 0;
  const collisions = [];

  for (const u of candidates) {
    const newEmail = toNewEmail(u.email);
    if (newEmail === u.email) continue;
    if (allEmails.has(newEmail)) {
      skippedCollision++;
      collisions.push({ from: u.email, to: newEmail });
      continue;
    }
    if (!DRY_RUN) {
      await users.updateOne(
        { _id: u._id },
        { $set: { email: newEmail } },
      );
    }
    renamed++;
  }

  // Backfill emailVerified=true cho mọi user (yêu cầu "toàn bộ user đã xác thực").
  let verifiedBackfilled = 0;
  if (!DRY_RUN) {
    const res = await users.updateMany(
      { emailVerified: { $ne: true } },
      { $set: { emailVerified: true, emailVerifiedAt: new Date() } },
    );
    verifiedBackfilled = res.modifiedCount;
  } else {
    verifiedBackfilled = await users.countDocuments({ emailVerified: { $ne: true } });
  }

  log('RESULT', `đổi email: ${renamed}, bỏ qua (trùng): ${skippedCollision}`);
  if (collisions.length) {
    log('COLLISIONS', JSON.stringify(collisions, null, 2));
  }
  log('VERIFY', `sẽ backfill emailVerified=true cho ${verifiedBackfilled} user`);

  await mongoose.disconnect();
  log('DONE', DRY_RUN ? 'dry-run hoàn tất (chưa ghi)' : 'migration hoàn tất');
};

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((err) => {
    console.error('[migrate-user-emails] LỖI:', err);
    process.exit(1);
  });
}

export { main, toNewEmail };
