/**
 * SEED DEMO ĐẦY ĐỦ — xoá toàn bộ dữ liệu hiện tại rồi tạo lại:
 *   node scripts/seed-restaurant-demo.mjs
 *
 * Đọc MONGODB_URL từ server/.env. THẬN TRỌNG: lệnh này XOÁ TOÀN BỘ database (dropDatabase).
 *
 * Tạo mới — **4 chủ nhà hàng, mỗi chủ demo 1 gói (free / basic / pro / enterprise)**:
 *   - 1 nhà hàng mỗi gói, kèm setting (mã bếp), bàn, danh mục + món ăn (đủ dùng, đúng trần gói)
 *   - Tài khoản: super-admin, 4 admin (chủ), 2 manager, 5 staff, 1 customer
 *   - Một bộ đơn + món + thanh toán (data báo cáo) cho nhà hàng Pro chính
 *
 * Mật khẩu dùng chung: Test@NhamNhi2026
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

const PASSWORD = 'Test@NhamNhi2026';
const DAY = 24 * 3600 * 1000;
const now = new Date();
const id = () => new mongoose.Types.ObjectId();

await mongoose.connect(uri);
console.log('[seed-restaurant-demo] CONNECT OK');

// ─── XOÁ TOÀN BỘ DỮ LIỆU ─────────────────────────────────────────────────────
await mongoose.connection.db.dropDatabase();
console.log('[seed-restaurant-demo] DROPPED toàn bộ database');

const db = mongoose.connection.db;
const hashed = await bcrypt.hash(PASSWORD, 10);

// ─── MENU POOL DÙNG CHUNG (theo danh mục) ───────────────────────────────────
const drinkOptions = [
  { name: 'Topping', type: 'multiple', required: false, min: 0, max: 3, choices: [
    { name: 'Trân châu', price: 5000 }, { name: 'Thạch', price: 4000 }, { name: 'Kem sữa', price: 6000 },
  ]},
  { name: 'Đường', type: 'single', required: true, choices: [
    { name: 'Ít đường', price: 0 }, { name: 'Bình thường', price: 0 }, { name: 'Nhiều đường', price: 0 },
  ]},
];
const hotpotOptions = [{ name: 'Khẩu vị', type: 'single', required: true, choices: [
  { name: 'Ít cay', price: 0 }, { name: 'Cay vừa', price: 0 }, { name: 'Cay nhiều', price: 0 },
]}];

const MENU_POOL = {
  'Khai vị': [
    ['Gỏi cuốn', 28000, { bestSeller: true, orderCount: 320, ingredients: ['Tôm', 'Thịt heo', 'Bún', 'Rau sống'] }],
    ['Chả giò', 35000, { orderCount: 210, ingredients: ['Thịt băm', 'Mộc nhĩ', 'Bánh tráng'] }],
    ['Gỏi gà xé phay', 42000, { orderCount: 150, ingredients: ['Gà', 'Bắp cải', 'Rau răm'] }],
    ['Súp cua', 45000, { orderCount: 98, ingredients: ['Cua', 'Trứng', 'Ngô'] }],
    ['Nem rán hải sản', 55000, { orderCount: 60, ingredients: ['Tôm', 'Mực', 'Thịt'] }],
  ],
  'Món chính': [
    ['Cơm tấm sườn', 50000, { bestSeller: true, orderCount: 410, ingredients: ['Sườn nướng', 'Cơm', 'Bì chả', 'Nước mắm'] }],
    ['Cơm gà xối mỡ', 58000, { orderCount: 200, ingredients: ['Gà', 'Cơm', 'Mỡ hành'] }],
    ['Phở bò', 60000, { bestSeller: true, orderCount: 380, ingredients: ['Bò', 'Bánh phở', 'Nước dùng'] }],
    ['Bún bò Huế', 55000, { orderCount: 220, ingredients: ['Bò', 'Giò heo', 'Bún', 'Sả'] }],
    ['Bánh mì thịt nướng', 35000, { orderCount: 180 }],
    ['Cơm chiên Dương Châu', 52000, { orderCount: 130, ingredients: ['Cơm', 'Tôm', 'Xá xíu', 'Trứng'] }],
    ['Mì xào bò', 55000, { orderCount: 90 }],
    ['Bún chả Hà Nội', 60000, { orderCount: 75, ingredients: ['Chả thịt nướng', 'Bún', 'Nước mắm chua ngọt'] }],
    ['Cơm sườn non', 62000, { orderCount: 85 }],
    ['Hủ tiếu Nam Vang', 55000, { orderCount: 110 }],
  ],
  'Hải sản': [
    ['Tôm nướng muối ớt', 180000, { bestSeller: true, orderCount: 260, ingredients: ['Tôm sú', 'Muối ớt'] }],
    ['Mực xào chua ngọt', 160000, { orderCount: 120 }],
    ['Cá lóc hấp bia', 150000, { orderCount: 95 }],
    ['Sò điệp nướng mỡ hành', 120000, { orderCount: 140 }],
    ['Ghẹ hấp bia', 250000, { orderCount: 55 }],
    ['Tôm chiên giòn', 170000, { orderCount: 70 }],
    ['Ốc hương nướng', 130000, { orderCount: 105 }],
    ['Cá kho tộ', 140000, { orderCount: 60 }],
  ],
  'Lẩu & Nướng': [
    ['Lẩu Thái hải sản', 350000, { bestSeller: true, orderCount: 180, optionGroups: hotpotOptions }],
    ['Lẩu bò nhúng dấm', 380000, { orderCount: 90 }],
    ['Lẩu gà lá é', 290000, { orderCount: 75 }],
    ['Nướng bò Mỹ', 280000, { orderCount: 150 }],
    ['Nướng heo sữa', 320000, { orderCount: 80 }],
    ['Gà nướng đất sét', 260000, { orderCount: 65 }],
    ['Lẩu riêu cua', 270000, { orderCount: 70 }],
    ['Bò nướng lá lốt', 95000, { orderCount: 130 }],
  ],
  'Đồ uống': [
    ['Nước ép cam', 35000, { orderCount: 210 }],
    ['Nước ép dưa hấu', 30000, { orderCount: 180 }],
    ['Sinh tố bơ', 45000, { orderCount: 240 }],
    ['Sinh tố xoài', 40000, { orderCount: 150 }],
    ['Trà sữa trân châu', 38000, { bestSeller: true, orderCount: 300, optionGroups: drinkOptions }],
    ['Nước chanh dây', 32000, { orderCount: 90 }],
    ['Coca Cola', 25000, { orderCount: 400 }],
    ['Nước suối', 15000, { orderCount: 500 }],
  ],
  'Cà phê & Trà': [
    ['Cà phê sữa đá', 32000, { bestSeller: true, orderCount: 520, optionGroups: drinkOptions, ingredients: ['Cà phê', 'Sữa đặc'] }],
    ['Cà phê đen đá', 28000, { orderCount: 330, optionGroups: drinkOptions }],
    ['Bạc xỉu', 35000, { orderCount: 210, optionGroups: drinkOptions }],
    ['Trà đào cam sả', 42000, { orderCount: 190, optionGroups: drinkOptions }],
    ['Trà gừng mật ong', 38000, { orderCount: 80 }],
    ['Cappuccino', 45000, { orderCount: 60 }],
  ],
  'Tráng miệng': [
    ['Chè ba màu', 25000, { orderCount: 160 }],
    ['Bánh flan', 28000, { orderCount: 130 }],
    ['Kem dừa', 35000, { bestSeller: true, orderCount: 200 }],
    ['Rau câu dừa', 22000, { orderCount: 90 }],
    ['Chè Thái', 30000, { orderCount: 110 }],
  ],
};

const CATEGORY_DESC = {
  'Khai vị': 'Các món khai vị nhẹ nhàng',
  'Món chính': 'Cơm, phở, bún và các món chính',
  'Hải sản': 'Tươi mỗi ngày',
  'Lẩu & Nướng': 'Đồ nướng và lẩu cho bàn đông',
  'Đồ uống': 'Nước ép, sinh tố, trà',
  'Cà phê & Trà': 'Thức uống nóng',
  'Tráng miệng': 'Chè, kem, bánh',
};

// ─── HÀM TẠO NHÀ HÀNG ────────────────────────────────────────────────────────
/**
 * Tạo 1 nhà hàng demo: user admin (chủ) + restaurant + setting + bàn + danh mục + món.
 * planKey: 'free' | 'basic' | 'pro' | 'enterprise' (đúng trần gói ở server PricingConfig).
 */
async function seedRestaurant({
  name,
  email,
  planKey,
  ownerEmail,
  ownerName,
  kitchenCode,
  categories, // mảng tên danh mục, mỗi mục: số món lấy từ pool
  tableLayout, // [{tableNumber, capacity}]
  staffCount,
}) {
  const restaurantId = id();
  const ownerId = id();
  const isFree = planKey === 'free';

  await db.collection('users').insertOne({
    _id: ownerId,
    name: ownerName,
    email: ownerEmail,
    role: 'admin',
    restaurantIds: [restaurantId],
    password: hashed,
    isActive: true,
    notificationEnabled: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection('restaurants').insertOne({
    _id: restaurantId,
    name,
    email,
    phone: '028 3822 1313',
    address: '27 Nguyễn Trãi, Quận 1, TP.HCM',
    operatingHours: '08:00 - 22:00',
    status: 'active',
    ownerId,
    subscription: 'active',
    currentPlanKey: planKey,
    // Gói Miễn Phí không có paidUntil (hết hạn → hạ về free theo vòng đời mới).
    ...(isFree ? {} : { paidUntil: new Date(now.getTime() + 30 * DAY) }),
    staffCount,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection('settings').insertOne({
    _id: id(),
    scope: 'restaurant',
    targetModel: 'Restaurant',
    targetId: restaurantId,
    paymentMethodType: 'payos',
    integrations: { payOS: { clientId: 'demo-client', apiKey: 'demo-key', checksumKey: 'demo-checksum' } },
    systemConfig: { autoPushKDS: true, maintenanceMode: false, requireOtpForVoid: false, kitchenCode },
    createdAt: now,
    updatedAt: now,
  });

  const tables = tableLayout.map((t) => ({
    _id: id(),
    restaurant: restaurantId,
    tableNumber: t.tableNumber,
    capacity: t.capacity,
    status: 'available',
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection('tables').insertMany(tables);

  const catDocs = Object.keys(categories).map((c) => ({
    _id: id(),
    name: c,
    description: CATEGORY_DESC[c] ?? '',
    restaurant: restaurantId,
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection('menucategories').insertMany(catDocs);
  const catByName = Object.fromEntries(catDocs.map((c) => [c.name, c._id]));

  const items = [];
  for (const [cat, count] of Object.entries(categories)) {
    const pool = MENU_POOL[cat] ?? [];
    for (const [nameItem, price, opts] of pool.slice(0, count)) {
      items.push({
        _id: id(),
        category: catByName[cat],
        restaurant: restaurantId,
        name: nameItem,
        price,
        isAvailable: true,
        description: '',
        tags: [],
        ingredients: opts.ingredients ?? [],
        rating: 0,
        orderCount: opts.orderCount ?? 0,
        bestSeller: opts.bestSeller ?? false,
        optionGroups: opts.optionGroups ?? [],
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await db.collection('menuitems').insertMany(items);

  return { restaurantId, tables, items };
}

// ─── SEED 4 NHÀ HÀNG (1 mỗi gói) ─────────────────────────────────────────────
const pro = await seedRestaurant({
  name: 'NhamNhi — Cơ Sở Chính',
  email: 'cs1@nhamnhi.vn',
  planKey: 'pro',
  ownerEmail: 'admin.test@nhamnhi.vn',
  ownerName: 'Admin Test',
  kitchenCode: '456734',
  categories: {
    'Khai vị': 5, 'Món chính': 10, 'Hải sản': 8, 'Lẩu & Nướng': 8,
    'Đồ uống': 8, 'Cà phê & Trà': 6, 'Tráng miệng': 5,
  },
  tableLayout: [
    ...[1, 2, 3, 4].map((n) => ({ tableNumber: n, capacity: 2 })),
    ...[5, 6, 7, 8, 9, 10].map((n) => ({ tableNumber: n, capacity: 4 })),
    ...[11, 12, 13, 14].map((n) => ({ tableNumber: n, capacity: 6 })),
    ...[15, 16].map((n) => ({ tableNumber: n, capacity: 8 })),
  ],
  staffCount: 5,
});

const basic = await seedRestaurant({
  name: 'NhamNhi — Gói Cơ Bản',
  email: 'cs2@nhamnhi.vn',
  planKey: 'basic',
  ownerEmail: 'admin.basic@nhamnhi.vn',
  ownerName: 'Admin Gói Cơ Bản',
  kitchenCode: '553572',
  categories: {
    'Khai vị': 4, 'Món chính': 6, 'Đồ uống': 5, 'Cà phê & Trà': 4, 'Tráng miệng': 3,
  },
  tableLayout: [
    ...[1, 2, 3].map((n) => ({ tableNumber: n, capacity: 2 })),
    ...[4, 5, 6, 7, 8].map((n) => ({ tableNumber: n, capacity: 4 })),
    ...[9, 10, 11].map((n) => ({ tableNumber: n, capacity: 6 })),
    ...[12].map((n) => ({ tableNumber: n, capacity: 8 })),
  ],
  staffCount: 2,
});

const free = await seedRestaurant({
  name: 'NhamNhi — Gói Miễn Phí',
  email: 'cs3@nhamnhi.vn',
  planKey: 'free',
  ownerEmail: 'admin.free@nhamnhi.vn',
  ownerName: 'Admin Gói Miễn Phí',
  kitchenCode: '653780',
  categories: {
    'Món chính': 5, 'Đồ uống': 4, 'Cà phê & Trà': 3,
  },
  tableLayout: [
    ...[1, 2].map((n) => ({ tableNumber: n, capacity: 2 })),
    ...[3, 4, 5].map((n) => ({ tableNumber: n, capacity: 4 })),
  ],
  staffCount: 1,
});

const enterprise = await seedRestaurant({
  name: 'NhamNhi — Gói Doanh Nghiệp',
  email: 'cs4@nhamnhi.vn',
  planKey: 'enterprise',
  ownerEmail: 'admin.enterprise@nhamnhi.vn',
  ownerName: 'Admin Gói Doanh Nghiệp',
  kitchenCode: '772915',
  categories: {
    'Khai vị': 5, 'Món chính': 10, 'Hải sản': 8, 'Lẩu & Nướng': 8,
    'Đồ uống': 8, 'Cà phê & Trà': 6, 'Tráng miệng': 5,
  },
  tableLayout: [
    ...[1, 2, 3, 4].map((n) => ({ tableNumber: n, capacity: 2 })),
    ...[5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ tableNumber: n, capacity: 4 })),
    ...[13, 14, 15, 16, 17, 18].map((n) => ({ tableNumber: n, capacity: 6 })),
    ...[19, 20].map((n) => ({ tableNumber: n, capacity: 8 })),
  ],
  staffCount: 4,
});

// ─── USER CÒN LẠI (super-admin, manager, staff, customer) ───────────────────
const manager1Id = id();
const manager2Id = id();
const staffIds = [id(), id(), id(), id(), id()];
const customerId = id();
const superAdminId = id();
const userBase = { password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now };
await db.collection('users').insertMany([
  { _id: manager1Id, name: 'Manager Test', email: 'manager.test@nhamnhi.vn', role: 'manager', restaurantIds: [pro.restaurantId], ...userBase },
  { _id: manager2Id, name: 'Manager Thu Ngân', email: 'manager2.test@nhamnhi.vn', role: 'manager', restaurantIds: [pro.restaurantId], ...userBase },
  ...staffIds.map((sid, i) => ({ _id: sid, name: `Nhân Viên ${i + 1}`, email: `staff${i === 0 ? '' : i + 1}.test@nhamnhi.vn`, role: 'staff', restaurantIds: [pro.restaurantId], ...userBase })),
  { _id: customerId, name: 'Customer Test', email: 'customer.test@nhamnhi.vn', role: 'customer', restaurantIds: [], ...userBase },
  { _id: superAdminId, name: 'Super Admin', email: 'super.admin@nhamnhi.vn', role: 'super-admin', restaurantIds: [], ...userBase },
]);
console.log('[seed-restaurant-demo] users OK (4 admin chủ + 2 manager + 5 staff + customer + super-admin)');

// ─── ĐƠN + MÓN + THANH TOÁN (data báo cáo — nhà hàng Pro chính) ──────────────
const byName = (items, n) => items.find((i) => i.name === n);
const tableOf = (tables, n) => tables.find((t) => t.tableNumber === n);

const paidOrders = [
  { table: 2, items: [['Phở bò', 2], ['Cà phê sữa đá', 2]], age: 1 },
  { table: 5, items: [['Cơm tấm sườn', 2], ['Trà sữa trân châu', 2], ['Kem dừa', 1]], age: 2 },
  { table: 8, items: [['Lẩu Thái hải sản', 1], ['Nước suối', 2]], age: 3 },
  { table: 12, items: [['Tôm nướng muối ớt', 1], ['Bò nướng lá lốt', 2], ['Coca Cola', 2]], age: 1 },
  { table: 3, items: [['Gỏi cuốn', 2], ['Cơm gà xối mỡ', 1], ['Sinh tố bơ', 1]], age: 5 },
];
for (const [oi, o] of paidOrders.entries()) {
  const orderId = id();
  const createdAt = new Date(now.getTime() - o.age * DAY);
  const orderItems = o.items.map(([name, qty]) => {
    const mi = byName(pro.items, name);
    return { _id: id(), order: orderId, restaurant: pro.restaurantId, menuItem: mi._id, nameSnapshot: mi.name, priceSnapshot: mi.price, quantity: qty, status: 'served', createdAt, updatedAt: createdAt };
  });
  const total = orderItems.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
  await db.collection('orderitems').insertMany(orderItems);
  const paidAt = new Date(createdAt.getTime() + 2 * 3600 * 1000);
  await db.collection('orders').insertOne({
    _id: orderId,
    orderId: `ORD-DEMO-${String(oi + 1).padStart(3, '0')}`,
    restaurant: pro.restaurantId,
    table: tableOf(pro.tables, o.table)._id,
    orderType: 'dine-in',
    status: 'paid',
    paymentStatus: 'paid',
    totalAmount: total,
    itemsCount: orderItems.reduce((s, i) => s + i.quantity, 0),
    items: orderItems.map((i) => i._id),
    paidAt,
    createdAt,
    updatedAt: paidAt,
  });
  await db.collection('payments').insertOne({
    _id: id(),
    order: orderId,
    restaurant: pro.restaurantId,
    orderCode: 3000 + oi,
    amount: total,
    method: oi % 2 === 0 ? 'cash' : 'banking',
    status: 'captured',
    transactionId: `TXN-DEMO-${1000 + oi}`,
    createdAt: paidAt,
    updatedAt: paidAt,
  });
}
// 1 đơn đang phục vụ (bàn 1 của nhà hàng Pro) — để POS có sẵn
{
  const orderId = id();
  const orderItems = [['Cà phê sữa đá', 2], ['Gỏi cuốn', 1]].map(([name, qty]) => {
    const mi = byName(pro.items, name);
    return { _id: id(), order: orderId, restaurant: pro.restaurantId, menuItem: mi._id, nameSnapshot: mi.name, priceSnapshot: mi.price, quantity: qty, status: 'served', createdAt: now, updatedAt: now };
  });
  const total = orderItems.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
  await db.collection('orderitems').insertMany(orderItems);
  await db.collection('orders').insertOne({
    _id: orderId,
    orderId: 'ORD-DEMO-ACTIVE',
    restaurant: pro.restaurantId,
    table: tableOf(pro.tables, 1)._id,
    orderType: 'dine-in',
    status: 'served',
    paymentStatus: 'unpaid',
    totalAmount: total,
    itemsCount: orderItems.reduce((s, i) => s + i.quantity, 0),
    items: orderItems.map((i) => i._id),
    createdAt: now,
    updatedAt: now,
  });
  await db.collection('tables').updateOne({ _id: tableOf(pro.tables, 1)._id }, { $set: { status: 'occupied', currentOrder: orderId } });
}
console.log('[seed-restaurant-demo] orders/payments OK (5 paid + 1 active cho nhà hàng Pro)');

// ─── ĐỒNG BỘ INDEX ───────────────────────────────────────────────────────────
await mongoose.connection.syncIndexes();
console.log('[seed-restaurant-demo] indexes synced');

console.log('[seed-restaurant-demo] DONE');
console.log('  super-admin : super.admin@nhamnhi.vn     / Test@NhamNhi2026');
console.log('  admin Pro   : admin.test@nhamnhi.vn      / Test@NhamNhi2026  → NhamNhi — Cơ Sở Chính');
console.log('  admin Basic : admin.basic@nhamnhi.vn     / Test@NhamNhi2026  → NhamNhi — Gói Cơ Bản');
console.log('  admin Free  : admin.free@nhamnhi.vn      / Test@NhamNhi2026  → NhamNhi — Gói Miễn Phí');
console.log('  admin Ent   : admin.enterprise@nhamnhi.vn/ Test@NhamNhi2026  → NhamNhi — Gói Doanh Nghiệp');
console.log('  manager     : manager.test@nhamnhi.vn    / Test@NhamNhi2026');
console.log('  manager 2   : manager2.test@nhamnhi.vn   / Test@NhamNhi2026');
console.log('  staff       : staff.test@nhamnhi.vn      / Test@NhamNhi2026');
console.log('  kitchen code: Pro=456734 · Basic=553572 · Free=653780 · Ent=772915');
for (const [plan, r] of [['free', free], ['basic', basic], ['pro', pro], ['enterprise', enterprise]]) {
  const c = await db.collection('menucategories').countDocuments({ restaurant: r.restaurantId });
  const m = await db.collection('menuitems').countDocuments({ restaurant: r.restaurantId });
  console.log(`  [${plan}] bàn=${r.tables.length} · danh mục=${c} · món=${m}`);
}

await mongoose.disconnect();
console.log('[seed-restaurant-demo] DISCONNECT OK');
