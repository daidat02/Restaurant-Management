# Load Test Queue — Restaurant Management

Kiểm tra độ chịu tải của luồng **khách quét QR gọi món** khi bật BullMQ queue:
nhà hàng phản hồi requests khách dưới tải, đồng thời queue (`order-fanout`,
`notification`) xử lý hết job, không để backlog.

## Kiến trúc test

```
k6 (order-flow.js)                          k6 (queue_monitor)
   │  POST /orders (dine-in)                       │  GET /api/queues/api/queues
   │  POST /api/orders/add-item                    │  (poll mỗi 2s)
   │  GET /api/menu/items/available/:id            ▼
   ▼                                        Bull Board API → backlog gauge
Express server (local, ENABLE_REDIS=true)
   ├─ Mongoose → Mongo (localhost:27099, data seeded 50 nhà hàng)
   └─ BullMQ → Redis (localhost:6380)
        ├─ order-fanout  (new-order: socket + create-notification + orderCount)
        └─ notification  (create-notification)
```

Tỷ lệ công việc:
- **80%** đọc menu (`GET /api/menu/items/available/:restaurantId`) — tải đọc.
- **20%** tạo đơn (`POST /api/orders`) kèm `POST /api/orders/add-item` — mỗi đơn
  đẩy **2 job** vào queue `order-fanout` (1 CREATE + 1 ADD_ITEMS), mô phỏng tiêu
  thụ queue dưới tải tạo đơn thật.

Load profile: ramp **5 → 25 → 50 VU**, mỗi giai đoạn 60s (tổng ~3 phút).

## Chuẩn bị

```bash
brew install k6        # cần k6 >= 0.46
```

## Chạy nhanh (1 lệnh)

```bash
./loadtest/run.sh
```

`run.sh` tự làm: dựng Mongo `mongo:7` (port 27099) + Redis `redis:7-alpine`
(port 6380) in Docker → build server → seed 50 nhà hàng vào Mongo **local**
(an toàn, KHÔNG đụng Atlas trong `server/.env`) → start server
(`ENABLE_REDIS=true`, `RATE_LIMIT_ENABLED=false`) → chạy k6 → ghi
`loadtest/summary.json` + `loadtest/results.json`.

## Chạy manual từng bước

```bash
# 1. Seed (chỉ row liên quan, đè được MONGODB_URL để luôn nhắm local):
cd server
MONGODB_URL=mongodb://localhost:27099/restaurant \
  node scripts/seed-loadtest.mjs --out ../loadtest/test-data.json

# 2. Start server (bật queue + tắt rate limit để không dính 429):
cd server
PORT=8000 \
  MONGODB_URL=mongodb://localhost:27099/restaurant \
  ENABLE_REDIS=true \
  REDIS_URL=redis://localhost:6380 \
  RATE_LIMIT_ENABLED=false \
  NODE_ENV=production \
  node dist/index.js

# 3. Chờ /api/queues/api/queues trả 200 (Bull Board mount), rồi chạy k6:
k6 run -e BASE_URL=http://localhost:8000 \
  -e TEST_DATA=loadtest/test-data.json \
  loadtest/order-flow.js
```

## Đọc kết quả

`run.sh` in ở cuối (từ `handleSummary`):

| Metric | Ý nghĩa | Chữa lỗi |
| ------ | ------- | -------- |
| `q_backlog_*` | (waiting + active) max của queue — **reflection nghẽn tiêu thụ** | backlog dài → tăng `concurrency` trong `server/src/queues/*`, xem processor cost |
| `q_completed_*` | tổng job đã xong (nên ≈ số đơn × 2 phút cuối test) | chênh lệch lớn → mất job / bị retry |
| `q_failed_*` | job thất bại | đọc `server/src/jobs` + log server |
| `order_create_latency` | P95 latency tạo đơn (đã tính thời gian chờ add-job) | P95 cao kèm backlog 0 → chậm ở DB/API, không phải queue |
| `http_req_failed` | tỷ lệ lỗi HTTP (threshold < 1%) | 429 → set lại `RATE_LIMIT_ENABLED`; 500 → xem log |

Tiêu chí chấp nhận đề xuất:
- `http_req_failed < 1%` trong toàn thời gian ramp.
- `order_create P95 < 1500ms` ngay cả ở tải 50 VU.
- Backlog `order-fanout`/`notification` trở về **0** trong vòng vài giây sau
  khi k6 kết thúc (poll monitor dừng cùng lúc; xem `q_backlog_*` max thấp và
  `q_completed_*` không lệch với số đơn tạo thành công).

## Tùy biến

- `DURATION=--duration 90s ./loadtest/run.sh` — chạy ngắn (smoke test) hoặc dài.
- Sửa stages / VUs trong `options.scenarios` của `order-flow.js`.
- Muốn monitor tách riêng: script k6 vẫn một file, chạy 2 tiến trình:
  `k6 run -e SCENARIO=monitor-only ...` được hỗ trợ sẵn.

## Kiến trúc queue được đo (tóm tắt)

- `order.service.ts` gọi `addJob(QUEUE_NAMES.orderFanOut, 'new-order', …)` tại
  tạo đơn (dòng ~186) và add-item (dòng ~380) — công việc nặng (socket fanout,
  tạo notification, tăng `orderCount`) được dồn về job chạy nền.
- Concurrency hiện tại: `order-fanout`.concurrency = 5, `notification` = 5,
  `payment-webhook` = 1 (`server/src/queues/`).
- Redis down → `addJob` chạy **inline đồng bộ** (fallback an toàn, chi phí test
  sẽ phản ánh đúng).