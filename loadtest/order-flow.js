// loadtest/order-flow.js — kịch bản khách quét QR gọi món (không đăng nhập).
//   - orderFlow (80% đọc menu / 20% tạo đơn): ramping-vus 5 → 25 → 50 (3×60s).
//   - queueMonitor (1 VU): poll Bull Board queue counts mỗi 2s.
//
// Test data: loadtest/test-data.json (tạo bởi server/scripts/seed-loadtest.mjs).
//
// Chạy: k6 run -e BASE_URL=http://localhost:8000 -e TEST_DATA=loadtest/test-data.json loadtest/order-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Gauge, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const DATA_PATH = __ENV.TEST_DATA || 'test-data.json';
const RESTAURANTS = JSON.parse(open(DATA_PATH));

if (!Array.isArray(RESTAURANTS) || RESTAURANTS.length === 0) {
  throw new Error(`TEST_DATA rỗng hoặc không phải array: ${DATA_PATH}`);
}

// ── Metrics riêng cho queue (Backlog = waiting + active) ─────────────────────
const Q_NAMES = ['notification', 'order-fanout', 'payment-webhook'];
const Q_KEY = Object.fromEntries(Q_NAMES.map((n) => [n, n.replace(/-/g, '_')]));
const backlog = Object.fromEntries(Q_NAMES.map((n) => [n, new Gauge(`q_backlog_${Q_KEY[n]}`)]));
const doneCnt = Object.fromEntries(Q_NAMES.map((n) => [n, new Gauge(`q_completed_${Q_KEY[n]}`)]));
const failCnt = Object.fromEntries(Q_NAMES.map((n) => [n, new Gauge(`q_failed_${Q_KEY[n]}`)]));
const orderCreateLatency = new Trend('order_create_latency', true);

export const options = {
  scenarios: {
    order_flow: {
      executor: 'ramping-vus',
      exec: 'orderFlow',
      startVUs: 2,
      stages: __ENV.SMOKE
        ? [
            { duration: '15s', target: 2 },
            { duration: '15s', target: 4 },
          ]
        : [
            { duration: '60s', target: 25 },
            { duration: '60s', target: 50 },
            { duration: '60s', target: 50 },
          ],
      gracefulStop: '30s',
    },
    queue_monitor: {
      executor: 'constant-vus',
      exec: 'queueMonitor',
      vus: 1,
      duration: __ENV.SMOKE ? '45s' : '3m30s',
      startTime: '0s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Nhóm đọc menu (80% requests) ─────────────────────────────────────────────
export function readMenu() {
  const restaurant = pickRandom(RESTAURANTS);
  const res = http.get(
    `${BASE_URL}/api/menu/item/available/${restaurant.restaurantId}`,
    { tags: { group: 'menu' } },
  );
  check(res, { 'menu 200': (r) => r.status === 200 });
}

// ── Nhóm tạo đơn (20%) — mỗi đơn đẩy job `new-order` vào queue order-fanout ──
export function orderFlow() {
  const restaurant = pickRandom(RESTAURANTS);
  const tableId = pickRandom(restaurant.tableIds);
  const dishIds = restaurant.dishIds;

  // 80/20: giữ đúng tỷ lệ nhóm trong toàn kịch bản.
  const roll = Math.random();
  if (roll < 0.8) {
    readMenu();
    return;
  }

  // Bước 1: tạo đơn dine-in tại bàn với 1 món.
  const orderId = `LT-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const start = Date.now();
  const createRes = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      orderId,
      orderType: 'dine-in',
      table: tableId,
      restaurant: restaurant.restaurantId,
      items: [{ menuItem: pickRandom(dishIds), quantity: 1 }],
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { group: 'order_create' } },
  );
  orderCreateLatency.add(Date.now() - start);

  const createOk = check(createRes, {
    'create order 200/201': (r) => r.status === 200 || r.status === 201,
  });

  const createdOrderId = createRes.json('data._id') || createRes.json('data.orderId') || orderId;

  // Nghỉ ngắn giữa 2 bước để giảm đối chọi (vẫn mô phỏng khách gọi thêm món).
  sleep(randomIntBetween(1, 3));

  // Bước 2: thêm món thứ 2 → đẩy thêm 1 job `new-order` (ADD_ITEMS).
  if (createOk && createdOrderId) {
    const addRes = http.post(
      `${BASE_URL}/api/orders/add-item`,
      JSON.stringify({
        orderId: createdOrderId,
        items: [{ menuItem: pickRandom(dishIds), quantity: 1 }],
      }),
      { headers: { 'Content-Type': 'application/json' }, tags: { group: 'order_add_item' } },
    );
    check(addRes, { 'add-item 200': (r) => r.status === 200 });
  }
}

// ── VU monitor: poll Bull Board API mỗi 2s, cập nhật gauge backlog ────────────
export function queueMonitor() {
  const res = http.get(`${BASE_URL}/api/queues/api/queues`, {
    tags: { group: 'queue_metrics' },
  });
  if (res.status !== 200) {
    console.warn(`[monitor] /api/queues trả ${res.status} — đang phải mount Bull Board?`);
    sleep(2);
    return;
  }
  try {
    const queues = res.json('queues') || [];
    for (const q of queues) {
      if (!Q_NAMES.includes(q.name)) continue;
      const counts = q.counts || {};
      backlog[q.name].add((counts.waiting || 0) + (counts.active || 0));
      doneCnt[q.name].add(counts.completed || 0);
      failCnt[q.name].add(counts.failed || 0);
    }
  } catch (e) {
    console.warn(`[monitor] parse lỗi: ${e.message}`);
  }
  sleep(2);
}

// ── Summary bổ sung: điểm nghẽn queue qua backlog max ────────────────────────
export function handleSummary(data) {
  const out = [];
  out.push('=== Queue backlog (waiting + active) — max mỗi queue ===');
  for (const n of Q_NAMES) {
    const v = data.metrics[`q_backlog_${Q_KEY[n]}`] || {};
    out.push(`  ${n.padEnd(20)} max=${v.value?.max ?? (v.values ? v.values.max : 'n/a')}`);
  }
  out.push('');
  out.push('=== Đơn tạo được (order_create) ===');
  const oc = data.metrics.order_create_latency || {};
  out.push(
    `  avg=${oc.value?.avg}ms  p(90)=${oc.value?.['p(90)'] ?? oc.values?.['p(90)']}ms  p(95)=${oc.value?.['p(95)'] ?? oc.values?.['p(95)']}ms`,
  );
  console.log(out.join('\n'));
  return { stdout: JSON.stringify(data, null, 2) };
}