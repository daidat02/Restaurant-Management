/**
 * SEED DỮ LIỆU LOAD TEST (k6) — 50 nhà hàng × 4 danh mục × 5 món × 20 bàn.
 *   node scripts/seed-loadtest.mjs [--out ../loadtest/test-data.json]
 *
 * Đọc MONGODB_URL từ server/.env, CHỈ xóa + seed 4 collection liên quan
 * (restaurants, menucategories, menuitems, tables) — GIỮ NGUYÊN users/settings
 * để các luồng khác không bị ảnh hưởng. Tạo thêm user loadtest? KHÔNG — luồng
 * load test là customer scan-QR (các endpoint public /tables/:id, /orders,
 * /orders/add-item, /orders/table/:tableId), không cần đăng nhập.
 *
 * - 50 nhà hàng: subscription='active' + paidUntil 30 ngày (tránh 403
 *   RESTAURANT_LOCKED khi tạo đơn — order.service.ts assertRestaurantUsable).
 * - ObjectId CỐ ĐỊNH theo quy luật → test-data.json ổn định, commit được, k6
 *   config tĩnh dùng trực tiếp.
 * - Giá món deterministic theo chỉ số (20k + (idx%19)*10k) → luôn trong 20k–200k.
 * - insertMany() theo từng collection cho tốc độ.
 *
 * Output: loadtest/test-data.json
 *   [{ restaurantId, tableIds: [20], dishIds: [20] }, ...50 nhà hàng]
 */
import mongoose from 'mongoose';
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
// Cho phép override an toàn khi test (import .env là mặc định):
//   MONGODB_URL=mongodb://localhost:27017/restaurant node scripts/seed-loadtest.mjs
const uri = process.env.MONGODB_URL || env.MONGODB_URL;
if (!uri) throw new Error('Thiếu MONGODB_URL trong server/.env');

// ─── CẤU HÌNH SEED ───────────────────────────────────────────────────────────
const NUM_RESTAURANTS = 50;
const CATEGORIES = ['Khai vị', 'Món chính', 'Đồ uống', 'Tráng miệng'];
const DISHES_BY_CATEGORY = {
  'Khai vị': ['Gỏi cuốn', 'Chả giò', 'Súp cua', 'Nem nướng', 'Cá chiên giòn'],
  'Món chính': ['Phở bò', 'Cơm tấm', 'Bún bò Huế', 'Gà rang muối', 'Cá kho tộ'],
  'Đồ uống': ['Trà đào', 'Cà phê sữa', 'Nước ép cam', 'Trà sữa trân châu', 'Sinh tố bơ'],
  'Tráng miệng': ['Chè thập cẩm', 'Bánh flan', 'Kem dừa', 'Rau câu dừa', 'Trái cây dĩa'],
};
const NUM_TABLES = 20;
const DAY = 24 * 3600 * 1000;

// ─── OBJECTID CỐ ĐỊNH THEO QUY LUẬT ──────────────────────────────────────────
// 24 hex: prefix '66ad0f00' (8) + index 16 hex. Dải index riêng từng loại
// để không đụng nhau: restaurant 1..50 / category / dish / table.
const hexId = (n) => new mongoose.Types.ObjectId('66ad0f00' + n.toString(16).padStart(16, '0'));
const restaurantId = (i) => hexId(i);
const categoryId = (i, c) => hexId(10_000 + i * 10 + c);
const dishId = (i, c, k) => hexId(20_000 + i * 100 + c * 10 + k);
const tableId = (i, t) => hexId(30_000 + i * 100 + t);

// Giá deterministic trong 20k–200k theo CHỈ SỐ TOÀN CỤC của món trong nhà hàng
// (1..20) để trải đủ dải giá, không bị kẹt ở 20k–60k:
//   price = 20k + ((globalIdx - 1) % 19) * 10k  →  20k, 30k, ..., 200k
const dishPrice = (k) => 20_000 + ((k - 1) % 19) * 10_000;

// ─── MAIN ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0
  ? path.resolve(process.cwd(), args[outIndex + 1])
  : path.resolve(__dirname, '../../loadtest/test-data.json');

console.log(`[seed-loadtest] MONGODB_URL=${uri.replace(/:\/\/.*@/, '://***@')}`);
console.log(`[seed-loadtest] output=${outPath}`);

await mongoose.connect(uri);
console.log('[seed-loadtest] CONNECT OK');

const db = mongoose.connection.db;

// 1. Xóa dữ liệu cũ — CHỈ 4 collection liên quan (giữ users/settings).
const COLLECTIONS = ['restaurants', 'menucategories', 'menuitems', 'tables'];
for (const name of COLLECTIONS) {
  const { deletedCount } = await db.collection(name).deleteMany({});
  console.log(`[seed-loadtest] cleared ${name} (${deletedCount} docs)`);
}

const now = new Date();
const operatingHours = '08:00 - 22:00';

// 2. Nhà hàng.
const restaurants = [];
for (let i = 1; i <= NUM_RESTAURANTS; i++) {
  restaurants.push({
    _id: restaurantId(i),
    name: `Nhà Hàng Load Test ${String(i).padStart(2, '0')}`,
    email: `loadtest${i}@nhamnhi.vn`,
    address: 'KCN Sài Gòn, TP.HCM',
    operatingHours,
    status: 'active',
    subscription: 'active',
    paidUntil: new Date(now.getTime() + 30 * DAY),
    currentPlanKey: 'basic',
    createdAt: now,
    updatedAt: now,
  });
}
await db.collection('restaurants').insertMany(restaurants);
console.log(`[seed-loadtest] restaurants OK (${restaurants.length})`);

// 3. Danh mục + món ăn.
const categories = [];
const dishes = [];
for (let i = 1; i <= NUM_RESTAURANTS; i++) {
  CATEGORIES.forEach((catName, cIdx) => {
    const c = cIdx + 1;
    categories.push({
      _id: categoryId(i, c),
      name: catName,
      restaurant: restaurantId(i),
      description: '',
      createdAt: now,
      updatedAt: now,
    });
    DISHES_BY_CATEGORY[catName].forEach((dishName, kIdx) => {
      const k = kIdx + 1;
      const globalIdx = cIdx * 5 + k; // 1..20 — để giá trải 20k..200k
      dishes.push({
        _id: dishId(i, c, k),
        category: categoryId(i, c),
        restaurant: restaurantId(i),
        name: dishName,
        price: dishPrice(globalIdx),
        isAvailable: true,
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
    });
  });
}
await db.collection('menucategories').insertMany(categories);
await db.collection('menuitems').insertMany(dishes);
console.log(`[seed-loadtest] categories OK (${categories.length})`);
console.log(`[seed-loadtest] dishes OK (${dishes.length})`);

// 4. Bàn ăn.
const tables = [];
for (let i = 1; i <= NUM_RESTAURANTS; i++) {
  for (let t = 1; t <= NUM_TABLES; t++) {
    tables.push({
      _id: tableId(i, t),
      restaurant: restaurantId(i),
      tableNumber: t,
      capacity: 2 + ((t - 1) % 3),
      status: 'available',
      createdAt: now,
      updatedAt: now,
    });
  }
}
await db.collection('tables').insertMany(tables);
console.log(`[seed-loadtest] tables OK (${tables.length})`);

// 5. Export test-data.json cho k6.
const data = [];
for (let i = 1; i <= NUM_RESTAURANTS; i++) {
  data.push({
    restaurantId: restaurantId(i).toString(),
    tableIds: Array.from({ length: NUM_TABLES }, (_, idx) => tableId(i, idx + 1).toString()),
    dishIds: CATEGORIES.flatMap((catName, cIdx) =>
      DISHES_BY_CATEGORY[catName].map((_, kIdx) =>
        dishId(i, cIdx + 1, kIdx + 1).toString(),
      ),
    ),
  });
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`[seed-loadtest] test-data.json OK (${data.length} restaurants) → ${outPath}`);

await mongoose.disconnect();
console.log('[seed-loadtest] DISCONNECT OK — DONE');