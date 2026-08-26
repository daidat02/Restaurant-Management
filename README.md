# Restaurant Management System — NhaHang OS

> Hệ thống quản lý nhà hàng **multi-tenant SaaS (O2O)** full-stack: Node.js + Express + TypeScript + Socket.IO (backend `server/`), React 19 + Vite + Redux Toolkit (frontend `client/`), MongoDB. Hỗ trợ quản lý bàn, đặt chỗ, menu, order, POS, KDS (màn hình bếp), thanh toán trực tuyến (PayOS / VNPay cho đơn hàng **và gói cước**), chat nội bộ staff/manager/admin realtime, thuê bao **4 gói (Miễn Phí / Cơ Bản / Pro / Doanh Nghiệp)** với plan gating + vòng đời mới (hết hạn → tự hạ Miễn Phí), và báo cáo phân tích.

- **Live Demo:** [nhahangos.me](https://nhahangos.me/)
- **Repository:** [github.com/daidat02/Restaurant-Management](https://github.com/daidat02/Restaurant-Management)

---

## Tài khoản dùng thử

Mật khẩu dùng chung: `Test@NhamNhi2026` — seed bằng `cd server && node scripts/seed-test-accounts.mjs` (idempotent, theo `MONGODB_URL` trong `server/.env`).

| Role                         | Email                         | Ghi chú                                                                                        |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Super Admin                  | `super.admin@nhahangos.me`      | Nền tảng: tenants, pricing (4 gói + featureKeys), transactions, audit, **gateway PayOS/VNPay** |
| Admin — Gói **Pro**          | `admin.test@nhahangos.me`       | `/admin/*` (quản toàn chuỗi), billing & subscription, 16 bàn · 50 món · KDS                    |
| Admin — Gói **Cơ Bản**       | `admin.basic@nhahangos.me`      | 12 bàn · 22 món — không KDS / báo cáo nâng cao                                                 |
| Admin — Gói **Miễn Phí**     | `admin.free@nhahangos.me`       | 5 bàn · 12 món — test plan gate (bàn 6/món 31/NV 3 bị chặn)                                    |
| Admin — Gói **Doanh Nghiệp** | `admin.enterprise@nhahangos.me` | 20 bàn · 50 món — không giới hạn                                                               |
| Manager                      | `manager.test@nhahangos.me`     | `/manager/*`: menu, POS, bàn, đặt bàn, nhân viên, báo cáo                                      |
| Staff                        | `staff.test@nhahangos.me`       | POS, sơ đồ bàn, đơn hàng, đặt chỗ                                                              |
| Customer                     | `customer.test@nhahangos.me`    | Login khách, lịch sử đơn, đặt chỗ                                                              |

**Mã nhà bếp (KDS):** Pro `456734` · Cơ Bản `553572` · Miễn Phí `653780` · Doanh Nghiệp `772915`. Mật khẩu dùng chung: `Test@NhamNhi2026`. Seed lại toàn bộ data demo: `node server/scripts/seed-restaurant-demo.mjs`. Reset super-admin: `SUPER_ADMIN_PASSWORD='...' node server/scripts/reset-super-admin.mjs`.

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Mô hình Multi-Tenant & Vai trò](#mô-hình-multi-tenant--vai-trò)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Luồng nghiệp vụ](#luồng-nghiệp-vụ)
- [Thanh toán: đơn hàng & gói cước](#thanh-toán-đơn-hàng--gói-cước)
- [Thuê bao (Subscription)](#thuê-bao-subscription)
- [Audit Log](#audit-log)
- [Chat nội bộ (Messaging)](#chat-nội-bộ-messaging)
- [Realtime Socket.IO](#realtime-socketio)
- [BullMQ Message Queue](#bullmq-message-queue)
- [API Reference](#api-reference)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Biến môi trường](#biến-môi-trường)
- [Bảo mật](#bảo-mật)
- [Test & CI/CD](#test--cicd)
- [Triển khai (Deployment)](#triển-khai-deployment)

---

## Tổng quan

- **Customer:** xem menu, đặt bàn online, scan QR bàn → đặt món → thanh toán online.
- **Staff:** POS tại bàn, quản lý đơn, cập nhật trạng thái món, đặt chỗ, chat nội bộ.
- **Manager:** quản lý menu, bàn, nhân viên, đặt chỗ, báo cáo doanh thu, tạo mã nhà bếp (KDS).
- **Admin (chủ chuỗi):** quản lý **toàn chuỗi** chi nhánh — dashboard gộp, nhà hàng + cài đặt từng chi nhánh, billing & subscription, audit log toàn chuỗi, quản manager.
- **Super Admin:** nền tảng SaaS — khoá/mở nhà hàng, pricing, transactions, audit toàn hệ thống, **cấu hình cổng PayOS/VNPay cho gói cước**.
- **KDS:** màn hình bếp xác thực bằng mã nhà bếp 6 số (8 giờ), chỉ nhận event của đúng nhà hàng.

## Mô hình Multi-Tenant & Vai trò

Mỗi nhà hàng = 1 **tenant** trên cùng database. User có mảng `restaurantIds`; admin/manager/staff có thể thuộc nhiều nhà hàng và **chuyển đổi** bằng tenant switcher (`POST /api/auth/switch-tenant`, kiểm tra membership → 403 nếu không thuộc).

| Role          | Tenant scope                       | Vào được                                 |
| ------------- | ---------------------------------- | ---------------------------------------- |
| `super-admin` | Bypass mọi tenant check (nền tảng) | `/super-admin`                           |
| `admin`       | Toàn chuỗi `restaurantIds`         | `/admin` (không còn màn hình chọn cơ sở) |
| `manager`     | `restaurantIds[0]`                 | `/manager`                               |
| `staff`       | 1 chi nhánh                        | `/staff` (redirect POS)                  |
| `customer`    | Không có tenant                    | `/` (theo QR bàn)                        |
| `kds`         | 1 chi nhánh qua kitchenCode        | `/kds`                                   |

### Cơ chế chặn truy cập chéo (server)

- **`verifyTenant`**: `req.tenantId` luôn lấy từ **claim JWT** — KHÔNG tin URL param/query/body. Super-admin bypass qua param; admin phải sở hữu tenant; manager/staff verify DB membership.
- **`requireResourceTenant(resolver)`**: resource lấy theo `:id`, phải thuộc tenant người gọi (admin: thuộc chuỗi; người khác: bằng `req.tenantId`). Không tìm thấy → 404 (không leak).
- **`intersectRestaurantIds`**: lọc danh sách (audit, users, notifications, analytics) theo `restaurantIds`; ngoài phạm vi → 403.
- **`assertRestaurantActive`**: nhà hàng `inactive` hoặc subscription `locked` → 403 `RESTAURANT_LOCKED` → client mở modal upsell.
- **Upload** phân vùng Cloudinary theo tenant; **Socket rooms** prefix `restaurant_<id>` — server emit `io.to(room)`, cấm global `emit()`.

## Công nghệ sử dụng

### Backend — `server/`

Node.js + Express 5 (ESM) · TypeScript strict · MongoDB + Mongoose 8 (16 schemas) · Socket.IO 4 · JWT (access 30m + refresh 7d cookie) · Cloudinary + Multer · PayOS (`@payos/node`) · VNPAY (sandbox) · zod · Sentry (optional).

### Frontend — `client/`

React 19 + Vite · TypeScript · Redux Toolkit + redux-persist · React Router 7 · Tailwind CSS v4 + shadcn/ui (Radix, theme cerulean-blue) · Socket.IO Client · Axios · Recharts · qrcode.react · sonner.

### DevOps

GitHub Actions (CI: server typecheck+test+build / client typecheck+lint+build / e2e Playwright) · Vitest + supertest + MongoDB Memory Server · Vercel (client) · Render (server) · MongoDB Atlas.

## Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────┐
│   CLIENT (React 19 + Vite)                                        │
│   Pages/Routes ─ Components/shadcn ─ Redux ─ Socket.IO Client     │
└───────────────────────────┬───────────────────────────────────────┘
                            │ VITE_SERVER_BASE_URL → http://localhost:8000
┌───────────────────────────▼───────────────────────────────────────┐
│   SERVER (Express 5 + TS)                                          │
│   router/index.ts → Middlewares (auth/rateLimit/multer)            │
│      → Modules/* (controller + service + repository + routes)      │
│   Socket.IO (rooms: restaurant_<id>, order_<id>, payment_<id>,     │
│              conversation_<id>, subscription_payment_<txId>)       │
│   MongoDB (Mongoose) · Cloudinary · PayOS · VNPay                  │
└────────────────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
restaurant_management/
├── server/                          # Express 5 + TS (ESM)
│   ├── src/
│   │   ├── index.ts / app.ts        # entry + createApp() + /healthz
│   │   ├── router/index.ts          # mount /api
│   │   ├── configs/                 # db, socketsConfig, constants (encryptKey/decryptKey AES-256-CBC), cloudinary
│   │   ├── middlewares/             # auth.middleware (verifyToken/Role/Tenant/... tenancy chain), multer, rateLimit
│   │   ├── models/Schema/           # 16 schemas (User, Restaurant, Table, MenuItem, Order, OrderItem, Payment,
│   │   │                            #   Reservation, Notification, Setting [scope restaurant|admin|platform],
│   │   │                            #   Conversation, Message, Transaction [transactionId], AuditLog, PricingConfig)
│   │   ├── modules/                 # 15 modules (mỗi module: *.routes + *.controller + *.service)
│   │   │   ├── AuthModule  RestaurantModule  TableModule  ReservationModule
│   │   │   ├── MenuModule  OrderModule(+socket handler)  PaymentModule(+payos.service)
│   │   │   ├── UploadModule  Notification  SettingModule(+gateway)  AuditLogModule
│   │   │   ├── SubscriptionModule(+pricing)  SuperAdminModule  AnalyticModule  MessageModule
│   │   ├── services/                # dùng chung: auditLog, transaction-id, subscription,
│   │   │                            #   subscription-pay, subscription-payos, subscription-vnpay,
│   │   │                            #   cache.service (menu + BullMQ queue)
│   │   ├── queues/                  # BullMQ: connection (riêng maxRetries=null), queue registry (3 queue),
│   │   │                            #   workers (startWorkers/closeWorkers)
│   │   ├── jobs/                    # + handlers registry (addJob + fallback inline) + các job:
│   │   │                            #   payment.job, notification.job, order.job
│   │   ├── sockets/                 # index + order/payment/message/subscription handlers
│   │   └── scripts/migrate-tenant.ts
│   ├── scripts/                     # backup.sh, reset-super-admin.mjs, seed-test-accounts.mjs
│   ├── src/test/                    # 42 test files, ~360 tests (Vitest + Memory Server)
│   └── .env.example
├── client/                          # React 19 + Vite
│   └── src/
│       ├── App.tsx                  # routes + guards (ProtectedRoute/OnboardingRoute/CustomerRoute)
│       ├── api/ (17)  components/  configs/  constants/  hooks/ (17)  layouts/  pages/  redux/  types/  utils/
├── e2e/                             # Playwright
├── .github/workflows/ci.yml
├── docs/  design-system/  MISSION.md  NOTES.md  OPS.md  ROADMAP.VI.md
└── .opencode/skills/project-context/SKILL.md   # bản đồ chi tiết project (agent context)
```

## Luồng nghiệp vụ

### 1. Khách đặt món tại bàn (scan-to-order)

1. Quét QR bàn → `/scan-to-order?restaurantId=<id>&tableId=<id>` → thấy "Bàn số: XXX".
2. Chọn món → "Add +" → giỏ → "Xác nhận gửi đơn" → `POST /api/orders` (dine-in, `201`).
3. Đơn realtime tới KDS; món chuyển `pending → preparing → served`.
4. Thanh toán: chọn `cash` (tiền mặt) / `banking` (PayOS QR) / `ewallet` (VNPay).

### 2. Order & POS

- **POS** (`/manager/orders/pos`): lưới món (trái) + giỏ (phải), toggle mang về.
- **Quản lý đơn** (`/manager/orders/management`): filter theo trạng thái → Thanh toán / Chỉnh sửa / In bếp & hóa đơn.
- **Item status**: `pending → preparing → served` (realtime KDS + bàn); call-staff & request-payment qua socket.

### 3. Session / Subscription & Onboarding

- Đăng ký chủ (`register-owner`) → admin → wizard tạo nhà hàng đầu tiên → **gói Miễn Phí** (không dùng thử).
- Nhà hàng thứ 2+ → **trả phí trước** theo chu kỳ 1/3/6/12 tháng → `active` (gói Cơ Bản / Pro / Doanh Nghiệp).
- Hết hạn gói trả phí → **tự hạ về Miễn Phí** (không khoá); có `pendingPlanKey` → áp dụng gói đã lên lịch cuối chu kỳ.
- Đổi gói giữa chu kỳ: **upgrade** trả chênh lệch pro-rate, **downgrade** lưu `pendingPlanKey` áp dụng cuối kỳ.
- Plan gating: vượt trần bàn/món/NV hoặc thiếu tính năng → `403 PLAN_LIMIT_REACHED` → client mở modal upsell.
- Onboarding wizard: thông tin → cấu hình → nhân sự → bàn & QR.

## Thanh toán: đơn hàng & gói cước

Hệ thống có **2 lớp cổng thanh toán** cùng tên PayOS/VNPay nhưng khác mục đích:

|                | Đơn hàng (PaymentModule)                                                                      | Gói cước (SubscriptionModule)                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Chủ sở hữu key | Từng nhà hàng (`settings.integrations.payOS`, mã hoá)                                         | **Nền tảng** (`setting.gateway.*`, scope=`platform`, `PLATFORM_GATEWAY_TARGET_ID='000000000000000000000001'`)              |
| Cấu hình bởi   | Admin/manager trong Settings chi nhánh                                                        | **Super-admin** qua `GET/PUT /api/settings/gateway`                                                                        |
| Tạo link       | `POST /api/payments/banking/:orderId` (PayOS) / `POST /api/payments/ewallet/:orderId` (VNPay) | `POST /api/subscriptions/payos/create-url` / `POST /api/subscriptions/vnpay/create-url`                                    |
| Xử lý kết quả  | Webhook `POST /api/payments/webhook` / `POST /api/payments/return/vnpay`                      | `POST /api/subscriptions/webhook` / `GET /api/subscriptions/vnpay/return`                                                  |
| Realtime       | room `payment_<id>` → `payment_success`                                                       | room `subscription_payment_<transactionId>` → `subscription_payment_event` + room `restaurant_<id>` → `subscription_event` |

**Giao dịch gói cước** ghi vào `Transaction` với `transactionId` (dạng `yyyyMMdd` + 6 chữ số tăng dần, sinh bởi `services/transaction-id.service.ts`), `ownerId`, `cycleMonths`, `paidUntil`. Client `/admin/billing` dùng `DataTable` hiển thị lịch sử giao dịch và `use-subscription` hook lắng nghe kết quả thanh toán qua socket (`listenPaymentResult(transactionId, onResult)`).

## Thuê bao (Subscription)

- Mỗi nhà hàng: `subscription: 'trial' | 'active' | 'locked' | 'pending'` + `currentPlanKey` (`free|basic|pro|enterprise`) + `paidUntil` / `pendingPlanKey` (RestaurantSchema). `trial` giữ enum nhưng không dùng trong luồng mới.
- **State machine** (`services/subscription.service.ts`): gói trả phí hết hạn → **tự hạ Miễn Phí (KHÔNG khoá)**; có `pendingPlanKey` → áp dụng gói đã lên lịch cuối chu kỳ; mỗi lần đổi đều có audit `subscription.downgrade` + notification.
- **Plan gating** (`services/plan-gate.service.ts`): `assertLimit` (bàn/món/NV) + `assertFeature` (kds, advanced_report, messaging_group...) → vượt trần trả `403 PLAN_LIMIT_REACHED` kèm `meta`.
- Giá gói mặc định (PricingConfig, super-admin chỉnh tại `/super-admin/pricing`): mỗi gói có `priceMonthly` + giá 4 chu kỳ (1/3/6/12 tháng) + `limits` + `featureKeys`.
- Khoá tài khoản chủ (admin): `isActive=false` → mọi user của chủ không login được.

## Audit Log

- **Ghi (write)**: `writeAuditLog()` (service không-throw) tại các controller/service — `user.register`, `user.update.role`, `user.delete`, `user.switch-tenant`, `user.block/unblock`, `restaurant.create/delete/lock`, `subscription.free.assigned`, `subscription.downgrade`, `subscription.unlocked`, `transaction.create`, `pricing.update`, `setting.kds-code.generate`.
- **Xem (read)**: `GET /api/audit-logs` — **super-admin** (toàn nền tảng) + **admin** (chỉ chuỗi của mình); `GET /api/audit-logs/payments` — admin (lịch sử Transaction của chủ). **Manager/staff không được xem.**
- Schema: `{ action, restaurant, actor(+actorInfo.name/role tĩnh), targetType[order|table|menuItem|user|payment|restaurant|system|pricing], targetId, summary, meta, createdAt }`.
- UI: Super Admin `/super-admin/audit`; Admin `/admin/logs` (2 tab: Hành động + Thanh toán, DataTable).

> ⚠️ **Chưa có matrix audit chính thức theo role** (đang là công việc tiếp theo). Danh sách hành động chưa đầy đủ và vài hành động đề xuất chưa có route (xóa món, hoàn tiền, super-admin trả gói) hoặc mâu thuẫn quyền (manager đụng vào admin).

## Chat nội bộ (Messaging)

- Hộp thư (`MailBoxPopover`) trên Header mọi layout admin/manager/staff; badge tin chưa đọc.
- Hội thoại **direct (1-1)** + **group** (chỉ manager/admin tạo & quản member).
- Realtime: `send_message` (persist + ack thay tin optimistic + broadcast `new_message`), typing indicator, presence `user_online/offline`, `conversation_updated` tới `user_<id>` các member.
- Phân quyền: user chỉ thấy hội thoại thuộc chuỗi `restaurantIds`; group gắn đúng `restaurantId`.

## Realtime Socket.IO

- **Rooms**: `restaurant_<id>` · `user_<id>` · `order_<id>` · `payment_<id>` · `conversation_<id>` · `subscription_payment_<transactionId>`.
- Client→server: `init_room_restaurant`, `leave_restaurant`, `init_orders`, `join_order`, `subscribe_payment`, `join_conversation`, `send_message`, `typing`, `subscribe_subscription_payment`.
- Server→client: `order_event`, `new_notification`, `payment_success`, `new_message`, `conversation_updated`, `typing`, `user_online/offline`, `room_error`, `subscription_payment_event`, `subscription_event` (room `restaurant_<id>`), `subscription_payment_<transactionId>`.
- Bảo mật: `authenticateToken` (socket middleware), mọi join room đều `canAccessTenant`/membership check → sai thì `room_error`; **cấm global emit**.

## API Reference

Tất cả API prefix `/api`, JSON, Bearer token cho route cần auth. Ký hiệu: **Public** = không token · **User** = đã login · **Manager/Admin** = một trong các role · **Super Admin** = chỉ super-admin.

### Auth — `/api/auth`

| Method | Endpoint                                                | Auth                |
| ------ | ------------------------------------------------------- | ------------------- |
| POST   | `/register` · `/register-owner` · `/login` · `/refresh` | Public              |
| POST   | `/switch-tenant`                                        | User                |
| GET    | `/profile/me`                                           | User                |
| PATCH  | `/update/me`                                            | User                |
| POST   | `/reset-password` · `/change-password`                  | User                |
| GET    | `/` (users filter)                                      | Staff/Manager/Admin |
| POST   | `/admin/create` (staff/manager)                         | Manager/Admin       |
| PUT    | `/admin/update/:id` · DELETE `/admin/delete/:id`        | Manager/Admin       |

### Restaurants — `/api/restaurants`

| Method | Endpoint                      | Auth          |
| ------ | ----------------------------- | ------------- |
| POST   | `/` (tạo tenant)              | Admin         |
| GET    | `/` · `/:id`                  | Public / User |
| GET    | `/my`                         | Manager/Admin |
| PUT    | `/update/:id` · DELETE `/:id` | Admin         |
| PATCH  | `/status/:id`                 | Super Admin   |

### Tables — `/api/tables` · Reservations — `/api/reservations`

Table: POST `/create` (M/A) · PUT/DELETE `/:id` (M/A) · GET `/restaurant/:rid` + PATCH `/:id/status` (Staff/M/A).
Reservation: POST `/create` (Public) · `/create-by-staff` (Staff/M) · `/restaurants` + `/tables/slots` (Public) · `/me` (Customer) · GET `/:id` (A/Staff) · PUT `/update/:id` + `/update-status/:id` (Staff/M/A) · PUT `/cancel/:id` (Customer/Staff/Admin).

### Menu — `/api/menu`

Cat: POST `/category` + PUT `/category/:id` (Manager/Admin). Item: POST `/item` (Manager) · PUT `/item/:id` (Manager/Admin) · PUT `/item/:id/availability` (Staff/M/A). Reads: Public.

### Orders — `/api/orders`

| Method | Endpoint                                                            | Auth                |
| ------ | ------------------------------------------------------------------- | ------------------- |
| POST   | `/` · `/add-item`                                                   | Public (rate limit) |
| POST   | `/item/:itemId/:status`                                             | User                |
| GET    | `/my-orders`                                                        | Customer            |
| GET    | `/:id` · `/restaurant/:id[/:status]` · `/kds/:rid` · `/active/:rid` | User (tenant)       |
| GET    | `/table/:tableId`                                                   | Public              |
| PUT    | `/:id` (status)                                                     | Staff/Manager/Admin |

### Payments — `/api/payments`

| Method | Endpoint                                                  | Auth                |
| ------ | --------------------------------------------------------- | ------------------- |
| POST   | `/initiate`                                               | User                |
| PATCH  | `/status`                                                 | User                |
| POST   | `/banking/:orderId` (PayOS) · `/ewallet/:orderId` (VNPay) | Public (rate limit) |
| POST   | `/webhook` · `/return/vnpay`                              | Public              |
| POST   | `/:orderId/cancel` · `/check-connect`                     | Public              |
| GET    | `/:paymentId`                                             | User (tenant)       |

### Subscriptions — `/api/subscriptions`

| Method | Endpoint                                  | Auth   |
| ------ | ----------------------------------------- | ------ |
| POST   | `/pay` (mock)                             | Admin  |
| POST   | `/payos/create-url` · `/vnpay/create-url` | Admin  |
| POST   | `/webhook` (PayOS) · GET `/vnpay/return`  | Public |
| GET    | `/me` · `/transactions`                   | Admin  |

### Settings — `/api/settings`

POST `/create` (Admin) · GET/POST `/kds/verify` (Public, rate limit) · POST `/:id/kds-code` (M/A) · GET `/get-or-create/:scope/:model/:targetId` (M/A) · **GET/PUT `/gateway` (Super Admin — cổng gói cước)** · GET `/:id`+PUT `/:id`+PATCH `/:id/payment-method` (M/A/Staff) · DELETE `/:id` (Admin).

### Super Admin — `/api/admin`

GET `/admin/dashboard` · `/admin/tenants` · `/admin/transactions` · PATCH `/admin/users/:id/block` (Super Admin).

### Analytics — `/api/analytics`

Manager/Admin: `/overview` `/revenue-hourly` `/order-channels` `/revenue-branches`. Super Admin: `/revenue-channels` `/system-overview`.

### Audit — `/api/audit-logs`

GET `/` (Super Admin / Admin chuỗi) · GET `/payments` (Admin).

### Pricing — `/api/pricing`

GET `/pricing` (User) · PUT `/admin/pricing` (Super Admin).

### Conversations — `/api/conversations` (MessageModule)

GET `/` (list, chuỗi) · POST `/` (create) · GET `/direct/:userId` · GET+POST `/:id/messages` · POST `/:id/read` · POST `/:id/members` + DELETE `/:id/members/:userId` — manager/admin.

---

## Cài đặt & Chạy

### Yêu cầu

Node >= 18 · MongoDB (local/Atlas) · Cloudinary · PayOS/VNPay (sandbox).

### Server

```bash
cd server && npm install
cp .env.example .env        # điền MONGODB_URL, secrets...
npm run dev                 # tsc --watch + nodemon → http://localhost:8000
```

### Client

```bash
cd ../client && npm install
cp .env.example .env
npm run dev                 # → http://localhost:5173 (proxy → 8000)
```

### Build & Test

```bash
cd server && npm run build && npm test        # 42 files / ~360 tests
cd client && npm run build                    # tsc -b && vite build
npm run test:e2e                              # root — Playwright (build server trước)
```

### Seed tài khoản test

```bash
cd server && node scripts/seed-test-accounts.mjs   # đọc MONGODB_URL từ server/.env
```

## Biến môi trường

### Server — `server/.env`

```env
PORT=8000
MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
ALLOWED_ORIGINS=http://localhost:5173      # prod: https://<client>.vercel.app
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_EXPIRES_IN=30m
JWT_COOKIE_EXPIRES_IN=7
CLOUDINARY_URL= cloudinary://<key>:<secret>@<cloud_name>
VNP_HASHSECRET_KEY=change-me
VNP_TMNCODE=change-me
VNP_URL=https://sandbox.vnpay.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:8000/api/payments/vnpay-return
SENTRY_DSN=                                  # optional

# Redis cache + BullMQ queue (OPTIONAL — mặc định TẮT)
ENABLE_REDIS=false                           # true = bật cache menu + queue BullMQ
REDIS_URL=redis://localhost:6379
```

> PayOS key đơn hàng lưu trong `settings.integrations.payOS` (mã hoá). **PayOS/VNPay gói cước lưu trong `setting.gateway.*` (scope=platform)** — cả hai không nằm trong env, super-admin cấu hình qua UI `/super-admin/settings` (tab Nền tảng).

### Client — `client/.env`

```env
VITE_BASE_URL=http://localhost:5173
VITE_SERVER_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=
```

## Redis Cache (Menu)

Hệ thống có **lớp cache menu opt-in** — mặc định **TẮT** (`ENABLE_REDIS=false`), app chạy thuần Database.
Khi bật, các endpoint đọc menu theo nhà hàng (`GET /api/menu/category/:restaurantId`, `/item/available/:restaurantId`, `/items/:restaurantId`, `/items/bestsellers/:restaurantId`) được cache trong **1 key composite** `menu:{restaurantId}` (TTL 300s).

- **Fallback an toàn**: Redis down / không kết nối được → app KHÔNG crash, tự chuyển sang query Database; kết nối thử tối đa 3 lần rồi dừng, tự **hồi phục nền 30s** khi Redis sống lại.
- **Invalidate tự động**: khi tạo/sửa/ẩn-hiện danh mục hoặc món ăn (`POST/PUT` menu), key `menu:{restaurantId}` của nhà hàng đó bị xoá ngay → request kế tiếp đọc dữ liệu mới. Redis tắt → bỏ qua, không lỗi.
- **Wrapper generic**: `services/cache.service.ts` (`getOrSetCache`, `getCache`, `invalidateCache`) dùng cho module khác về sau (order, report…).
- `item/:id` và `item/category/:catId` không nằm trong cache (route không kèm restaurantId) — vẫn chạy Database trực tiếp.

## BullMQ Message Queue

Hệ thống có **3 queue nền (BullMQ)** để tách side-effect khỏi request chính — bật TẮT cùng `ENABLE_REDIS` / `REDIS_URL` (không cần env mới):

| Queue             | Job                   | Chạy khi                                      | Side-effect                                                                               |
| ----------------- | --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `payment-webhook` | `complete-payment`    | Webhook PayOS sau khi verify chữ ký (sync)    | Hoàn tất thanh toán (atomic + idempotent), emit `payment_success` / `order_event`, audit  |
| `notification`    | `create-notification` | Enqueue từ order-fanout (và nơi khác)         | Persist + emit `new_notification` qua room `restaurant_<id>`                              |
| `order-fanout`    | `new-order`           | Tạo đơn / thêm món (`POST /api/orders*`, POS) | (a) emit socket `order_event`, (b) enqueue `notification`, (c) tăng `orderCount` MenuItem |

- **Producer typed** (`jobs/handlers.ts` `addJob`): Redis không ready / enqueue lỗi → chạy **fallback inline** CÙNG handler worker (không lệch logic), lỗi inline theo policy: `payment-webhook`=propagate · `notification`/`order-fanout`=swallow (log, không hỏng luồng chính).
- **Worker**: `startWorkers()` chỉ gọi trong `index.ts` (không trong `createApp` — test không bật worker). Concurrency: payment `1`, notification `5`, order-fanout `5`. Graceful shutdown đợi job active ≤5s.
- **Emits theo status-change** (món `pending→…→served`, đơn paid/cancelled) **giữ sync** ở service —KHÔNG đi qua queue.
- **Khi Redis tắt**: queue không bật, `addJob` chạy inline → nghiệp vụ vẫn đủ (chỉ tốn chút thời gian request); `startWorkers()` bỏ qua an toàn, không crash.
- **Chạy local có Redis** (tùy chọn, để chạy worker nền): cài Redis rồi set `ENABLE_REDIS=true`. Ví dụ brew: `brew install redis && redis-server`; hoặc `docker run -d -p 6379:6379 redis:7`. Server dùng chung `REDIS_URL` với cache — không có env riêng.
- Tài liệu thiết kế: `.scratch/bullmq-queue/{SPEC.md,TICKETS.md}`.

## Bảo mật

- JWT dual-token; refresh trong HTTP-only cookie (tránh XSS). PayOS keys mã hoá AES-256-CBC khi lưu.
- Cô lập tenant: `verifyTenant` (token claim) + `requireResourceTenant`; socket room + `canAccessTenant`; upload folder theo tenant.
- Nhà hàng locked/inactive → chặn toàn bộ request tenant (403 `RESTAURANT_LOCKED`).
- Webhook thanh toán verify signature trước khi xử lý; rate limit route công khai (auth, order tạo, webhook, menu read, KDS verify).
- Không commit `.env` (trong `.gitignore`).

## Test & CI/CD

- **Backend**: Vitest + supertest + MongoDB Memory Server (ReplSet). 42 test files / ~360 tests, `fileParallelism:false`, seed cố định `SEED_IDS`.
- **E2E**: Playwright (`e2e/`), cần server + client (dùng `E2E_SERVER=test node dist/test/server.js` cho memory server).
- **CI** (`.github/workflows/ci.yml`): 3 job — server (npm ci → typecheck → test → build) · client (npm ci → typecheck → lint baseline → build) · e2e.

## Triển khai (Deployment)

- **Vercel (client)**: root `client`, build `npm run build`, output `dist`, env `VITE_SERVER_BASE_URL=https://<server>.onrender.com`.
- **Render (server)**: root `server`, build `npm ci && npm run build`, start `npm start`; đủ env + `NODE_ENV=production`.
- **MongoDB Atlas**: production DB. Ping giữ tỉnh: UptimeRobot gọi `GET /api/restaurants` mỗi 5 phút (hoặc `GET /healthz`). Backup: Atlas PITR hoặc `server/scripts/backup.sh` (mongodump, chạy ngoài Render).
- Chi tiết vận hành: `OPS.md` và `docs/HUONG-DAN-VAN-HANH.md`.

## Tác giả

**datnd.02** — [@daidat02](https://github.com/daidat02) · Deploy: [nhahangos.me](https://nhahangos.me/)
