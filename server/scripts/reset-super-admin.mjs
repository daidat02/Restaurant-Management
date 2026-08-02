/**
 * RESET SUPER-ADMIN (bản thuần JS, không cần build):
 *   SUPER_ADMIN_PASSWORD='YourPass123!' node scripts/reset-super-admin.mjs
 * Đảm bảo super.admin@nhamnhi.vn tồn tại, đúng role, isActive, đổi mật khẩu.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const loadEnv = (p) => {
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
};

const env = loadEnv(envPath);
const uri = env.MONGODB_URL;
if (!uri) throw new Error('Thiếu MONGODB_URL trong server/.env');

const EMAIL = 'super.admin@nhamnhi.vn';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Super@NhamNhi2026';

await mongoose.connect(uri);
console.log('[reset-super-admin] CONNECT OK');

const hashed = await bcrypt.hash(PASSWORD, 10);
const users = mongoose.connection.db.collection('users');
const updated = await users.updateOne(
  { email: EMAIL },
  {
    $set: {
      role: 'super-admin',
      isActive: true,
      password: hashed,
      restaurantIds: [],
      notificationEnabled: true,
    },
    $setOnInsert: { name: 'Super Admin' },
  },
  { upsert: true },
);

console.log(`[reset-super-admin] ${EMAIL} upserted (matched=${updated.matchedCount}, upserted=${updated.upsertedCount})`);

const doc = await users.findOne({ email: EMAIL });
if (doc) {
  console.log(`[reset-super-admin] role=${doc.role} isActive=${doc.isActive} hasPassword=${Boolean(doc.password)}`);
}

await mongoose.disconnect();
console.log('[reset-super-admin] DONE');
