/**
 * MIGRATION (chạy 1 lần): Chuyển dữ liệu hiện tại sang mô hình đa tenant.
 *
 * Cách chạy:
 *   1. Build:  npm run build  (hoặc npx tsc)
 *   2. Chạy:   node dist/scripts/migrate-tenant.js
 *
 * Nội dung:
 *   - Backup các collection bị ảnh hưởng sang `_backup_<timestamp>`.
 *   - Backfill `restaurant` cho OrderItem + Payment từ order.restaurant.
 *   - Đổi tên field `AuditLog.restaurantId` -> `restaurant`.
 *   - Gắn `restaurantIds` cho `admin@gmail.com` (NhamNhi = tenant đầu tiên).
 *   - Tạo account `super-admin` (nếu chưa tồn tại).
 *   - Đồng bộ index.
 *
 * Idempotent: chạy lại nhiều lần không gây lỗi/không tạo trùng.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import DB_Connection from '../models/DB_Connection.js';

const TENANT_NHA_MN_NHI = '69fccba996a14809070b9ef2';
const SUPER_ADMIN_EMAIL = 'super.admin@nhahangos.me';
const SUPER_ADMIN_PASSWORD = 'Super@NhamNhi2026';
const SUPER_ADMIN_NAME = 'Super Admin';

const log = (step: string, detail = '') => {
  console.log(`[migrate] ${step}${detail ? ` — ${detail}` : ''}`);
};

const backupCollections = async (db: mongoose.mongo.Db, names: string[]) => {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  for (const name of names) {
    const backupName = `_backup_${ts}_${name}`;
    const existing = await db.listCollections({ name: backupName }).toArray();
    if (existing.length > 0) {
      log('BACKUP', `${name} → ${backupName} (đã tồn tại, bỏ qua)`);
      continue;
    }
    const src = db.collection(name);
    await src.aggregate([{ $match: {} }, { $out: backupName }]).toArray();
    log('BACKUP', `${name} → ${backupName}`);
  }
};

const backfillRestaurant = async (
  model: mongoose.Model<any>,
  collectionName: string,
) => {
  // Lấy toàn bộ doc đang THIẾU field restaurant
  const missing = await model.find({ restaurant: { $exists: false } });
  if (missing.length === 0) {
    log(`BACKFILL ${collectionName}`, 'không có dòng thiếu restaurant');
    return 0;
  }

  const orderIds = Array.from(
    new Set(missing.map((doc: any) => doc.order?.toString()).filter(Boolean)),
  );
  const orders = await DB_Connection.Order.find({
    _id: { $in: orderIds },
  })
    .select('_id restaurant')
    .lean();
  const map = new Map(orders.map((o: any) => [o._id.toString(), o.restaurant]));

  const bulk = missing
    .filter((doc: any) => map.has(doc.order.toString()))
    .map((doc: any) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { restaurant: map.get(doc.order.toString()) } },
      },
    }));

  if (bulk.length > 0) {
    await model.bulkWrite(bulk);
  }
  log(
    `BACKFILL ${collectionName}`,
    `đã backfill ${bulk.length}/${missing.length} (${missing.length - bulk.length} thiếu order.restaurant)`,
  );
  return bulk.length;
};

const main = async () => {
  dotenv.config();
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong .env');

  await mongoose.connect(uri);
  const db = mongoose.connection.db as mongoose.mongo.Db;
  log('CONNECT', 'OK');

  // 1. Backup
  await backupCollections(db, ['orderitems', 'payments', 'auditlogs', 'users']);

  // 2. Backfill OrderItem + Payment
  await backfillRestaurant(DB_Connection.OrderItem, 'orderitems');
  await backfillRestaurant(DB_Connection.Payment, 'payments');

  // 3. Đổi tên field AuditLog.restaurantId -> restaurant
  const renamed = await DB_Connection.AuditLog.updateMany(
    { restaurantId: { $exists: true } },
    { $rename: { restaurantId: 'restaurant' } },
  );
  log('RENAME AuditLog', `modified ${renamed.modifiedCount} docs`);

  // 4. admin@gmail.com -> tenant NhamNhi (giữ role admin)
  const adminRes = await DB_Connection.User.updateOne(
    { email: 'admin@gmail.com' },
    { $set: { restaurantIds: [new mongoose.Types.ObjectId(TENANT_NHA_MN_NHI)] } },
  );
  log('ADMIN tenant', `admin@gmail.com restaurantIds=[${TENANT_NHA_MN_NHI}] (matched ${adminRes.matchedCount})`);

  // 5. Tạo super-admin (nếu chưa có)
  const existingSuper = await DB_Connection.User.findOne({ email: SUPER_ADMIN_EMAIL });
  if (existingSuper) {
    log('SUPER-ADMIN', `${SUPER_ADMIN_EMAIL} đã tồn tại, bỏ qua`);
  } else {
    const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    await DB_Connection.User.create({
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashed,
      role: 'super-admin',
      restaurantIds: [],
      isActive: true,
    });
    log('SUPER-ADMIN', `đã tạo ${SUPER_ADMIN_EMAIL}`);
  }

  // 6. Đồng bộ index
  await DB_Connection.OrderItem.ensureIndexes();
  await DB_Connection.Payment.ensureIndexes();
  // Drop index cũ của AuditLog (field restaurantId đã đổi tên)
  const auditIndexes = await db.collection('auditlogs').indexes();
  for (const idx of auditIndexes) {
    if (idx.name && idx.name.startsWith('restaurantId_')) {
      await db.collection('auditlogs').dropIndex(idx.name);
      log('INDEX AuditLog', `drop index cũ ${idx.name}`);
    }
  }
  await DB_Connection.AuditLog.ensureIndexes();
  await DB_Connection.User.ensureIndexes();
  log('INDEX', 'đã đồng bộ');

  // 7. Verify nhanh
  const orderItemsMissing = await DB_Connection.OrderItem.countDocuments({
    restaurant: { $exists: false },
  });
  const paymentsMissing = await DB_Connection.Payment.countDocuments({
    restaurant: { $exists: false },
  });
  const auditOldField = await DB_Connection.AuditLog.countDocuments({
    restaurantId: { $exists: true },
  });
  log('VERIFY', `OrderItem thiếu restaurant: ${orderItemsMissing}; Payment thiếu: ${paymentsMissing}; AuditLog còn restaurantId: ${auditOldField}`);

  await mongoose.disconnect();
  log('DONE', 'migration hoàn tất');
};

main().catch((err) => {
  console.error('[migrate] LỖI:', err);
  process.exit(1);
});
