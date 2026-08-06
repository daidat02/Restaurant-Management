# Restaurant Management System

> Hệ thống quản lý nhà hàng multi-tenant full-stack: Node.js + Express + TypeScript + Socket.IO (backend), React + Vite + Redux Toolkit (frontend), MongoDB (database). Hỗ trợ quản lý bàn, đặt chỗ, menu, order, POS, thanh toán trực tuyến (PayOS / VNPay), chat nội bộ staff realtime, KDS (màn hình bếp), thuê bao (subscription) và báo cáo phân tích.

- **Live Demo:** [nhamnhitidi.vercel.app](https://nhamnhitidi.vercel.app/)
- **Repository:** [github.com/daidat02/Restaurant-Management](https://github.com/daidat02/Restaurant-Management)

---

## Tài khoản dùng thử

Mật khẩu dùng chung cho tất cả tài khoản: `Test@NhamNhi2026`

| Role | Email | Ghi chú |
| --- | --- | --- |
| Super Admin | `super.admin@nhamnhi.vn` | Quyền nền tảng: tenants, pricing, transactions, audit, khoá/mở nhà hàng, gateway settings |
| Admin (chủ chuỗi) | `admin.test@nhamnhi.vn` | Tenant switcher (2 cơ sở) + `/admin/*`, billing, subscription |
| Manager | `manager.test@nhamnhi.vn` | `/manager/*`: menu, POS, bàn, đặt bàn, nhân viên, báo cáo |
| Staff | `staff.test@nhamnhi.vn` | POS, sơ đồ bàn, đơn hàng, đặt chỗ |
| Customer | `customer.test@nhamnhi.vn` | Đăng nhập khách, lịch sử đơn, đặt chỗ |
| Owner (3 nhà hàng thuê bao) | `owner.sub@nhamnhi.vn` | Test trial / sắp hết hạn / bị khoá + billing |

> Các tài khoản trên có thể seed lại lên DB (theo `MONGODB_URL` trong `server/.env`) bằng lệnh `node scripts/seed-test-accounts.mjs`. User `admin`/`manager`/`staff` tạo qua UI dùng mật khẩu mặc định `Test@NhamNhi2026`. Reset super-admin: `SUPER_ADMIN_PASSWORD='...' node scripts/reset-super-admin.mjs`.

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Mô hình Multi-Tenant](#mô-hình-multi-tenant)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Tính năng chính](#tính-năng-chính)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Biến môi trường](#biến-môi-trường)
- [API Reference](#api-reference)
- [Realtime với Socket.IO](#realtime-với-socketio)
- [Chat nội bộ (Messaging)](#chat-nội-bộ-messaging)
- [Luồng nghiệp vụ](#luồng-nghiệp-vụ)
- [Tích hợp thanh toán](#tích-hợp-thanh-toán)
- [Bảo mật](#bảo-mật)
- [Test & CI/CD](#test--cicd)
- [Triển khai (Deployment)](#triển-khai-deployment)
- [Đóng góp](#đóng-góp)

---

## Tổng quan

Hệ thống quản lý toàn diện hoạt động nhà hàng với các phân hệ:

- **Khách hàng (Customer):** Xem menu, đặt bàn trực tuyến, scan QR bàn -> đặt món -> thanh toán online.
- **Nhân viên (Staff):** Tiếp nhận đặt chỗ, quản lý order tại bàn, POS, cập nhật trạng thái món ăn, chat nội bộ.
- **Quản lý (Manager):** Quản lý menu, bàn, nhân viên, đặt chỗ, báo cáo doanh thu, tạo mã nhà bếp (KDS).
- **Admin:** Chủ chuỗi nhà hàng — toàn quyền quản trị, tenant switcher, billing & subscription, xem logs audit.
- **Super Admin:** Quyền nền tảng xuyên mọi nhà hàng: khoá/mở nhà hàng, pricing, transactions, audit log, gateway settings.
- **KDS (Kitchen Display System):** Màn hình bếp xác thực bằng mã nhà bếp (kitchen code) — không cần đăng nhập, chỉ nhận event của đúng nhà hàng.

## Mô hình Multi-Tenant

Hệ thống hỗ trợ **nhiều nhà hàng (tenant)** trên cùng một codebase & database:

- Mỗi user có mảng `restaurantIds` — **admin/manager/staff có thể thuộc nhiều nhà hàng** và chuyển đổi bằng tenant switcher. Khách hàng gắn với nhà hàng qua QR bàn / địa chỉ.
- **`verifyTenant`** middleware: `req.tenantId` luôn lấy từ **claim trong JWT** (`req.user.restaurantId`), KHÔNG tin param/query/body từ client — mọi query đều được lọc theo tenant, ngăn truy cập chéo. Super-admin bypass qua query/param/body.
- **Tenant switcher:** `POST /api/auth/switch-tenant` đổi ngữ cảnh của token, kiểm tra membership (`restaurantIds`) -> 403 nếu không thuộc.
- **Socket.IO** phòng theo tenant: `restaurant_<id>` — client chỉ auto-join phòng của tenant mình; server emit `io.to(room)` (không bao giờ global `emit`).
- **Upload** phân vùng folder Cloudinary theo tenant: `restaurants/<restaurantId>/...` (avatar khách -> `_public`); khi xoá kiểm tra ownership tenant.
- **QR bàn** encode `?restaurantId=<id>&tableId=<id>`; server xác minh bàn thuộc đúng nhà hàng khi tạo order (dine-in).
- **PayOS** key được lấy theo tenant từ cấu hình cài đặt của nhà hàng (không dùng key toàn cục); super-admin có thể đặt gateway mặc định.
- **KDS** token mang đúng `restaurantId`, chỉ nhận event / truy cập dữ liệu của đúng tenant.

### Tạo nhà hàng (tenant) mới

1. Admin đăng nhập -> `POST /api/restaurants` (tạo nhà hàng).
2. Tạo cấu hình cài đặt cho tenant: `GET /api/settings/get-or-create/restaurant/<model>/<targetId>` (tự tạo nếu chưa có) — lưu giờ mở cửa, PayOS keys, in ấn...
3. Tạo user cho tenant với `restaurantIds = [<id>]` (admin/manager/staff).
4. Tạo bàn cho nhà hàng -> UI `/manager/tables` tự render QR mang `restaurantId`.
5. Cấu hình PayOS: `PUT /api/settings/:id` (API key/checksum) hoặc qua UI Settings -> thanh toán. Nếu chưa cấu hình PayOS, thanh toán chỉ hỗ trợ tiền mặt.
6. KDS: admin/manager vào Settings -> "Tạo mã nhà bếp" -> hiển thị mã 6 chữ số; màn hình KDS nhập mã tại `/kds` (không cần đăng nhập).

> Lưu ý: để mỗi tenant dùng PayOS riêng, cần `setting.integrations.payOS.*` được cấu hình (mã hoá `apiKey`/`checksumKey`).

---

## Công nghệ sử dụng

### Backend (Server) — `server/`

| Công nghệ | Mục đích |
| --- | --- |
| Node.js + Express 5 | REST API framework |
| TypeScript (ESM, `type: module`) | Type safety, code quality |
| MongoDB + Mongoose 8 | Database chính (NoSQL), 16 schemas |
| Socket.IO 4 | Realtime: order, notification, presence, chat |
| JWT | Xác thực & phân quyền (access/refresh token) |
| Cloudinary | Lưu trữ ảnh món ăn, avatar, nhà hàng |
| PayOS (`@payos/node`) | Thanh toán chuyển khoản / QR ngân hàng |
| VNPAY | Cổng thanh toán điện tử (sandbox test) |
| Sentry | Theo dõi lỗi (optional) |

### Frontend (Client) — `client/`

| Công nghệ | Mục đích |
| --- | --- |
| React 19 + Vite | UI framework, build tool |
| TypeScript | Type safety |
| Redux Toolkit + redux-persist | State management |
| React Router 7 | Routing & bảo vệ route theo role |
| Tailwind CSS + shadcn/ui (Radix UI) | Styling & UI components |
| Socket.IO Client | Kết nối realtime với server |
| Axios | HTTP client |
| Recharts | Biểu đồ báo cáo |
| qrcode.react | QR bàn / thanh toán |
| Sonner | Toast notification |

### DevOps & Công cụ

| Công nghệ | Mục đích |
| --- | --- |
| GitHub Actions | CI: typecheck + test + build (server, client, e2e) |
| Vitest + supertest + mongodb-memory-server | Unit/integration test backend |
| Playwright | E2E test |
| Vercel | Deploy frontend |
| Render | Deploy backend |
| MongoDB Atlas | Database production |

---

## Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT (React + Vite)                   │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Pages/    │  │  Components  │  │  Socket.IO Client          │  │
│  │ Routes    │  │  (shadcn/ui) │  │  (order/chat/notification)│  │
│  └─────┬─────┘  └──────┬───────┘  └─────────────┬─────────────┘  │
│        └───────────────┴──────────────────────────┘              │
│                         HTTP (REST) + WebSocket                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ VITE_SERVER_BASE_URL → http://localhost:8000
┌────────────────────────────▼─────────────────────────────────────┐
│                  SERVER (Express + TypeScript)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │  router/     │→ │ Middlewares  │→ │  Modules/* (controller│   │
│  │  index.ts    │  │ auth/rate/   │  │  + service + routes)  │   │
│  │  /api/*      │  │ multer       │  └───────────┬───────────┘   │
│  └──────────────┘  └──────────────┘              │               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────▼───────────┐   │
│  │  Socket.IO   │  │  Cloudinary  │  │  MongoDB (Mongoose)   │   │
│  │  initSocket  │  │  (images)    │  │  16 schemas           │   │
│  └──────────────┘  └──────────────┘  └───────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │   Payment Gateways: PayOS (per-tenant) / VNPAY (sandbox)   │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Cấu trúc thư mục

```
restaurant_management/
├── server/                          # Backend — Express + TypeScript (ESM)
│   ├── src/
│   │   ├── index.ts                 # Entry point (Express + Socket.IO + MongoDB)
│   │   ├── app.ts                   # createApp() — CORS, JSON, routes, error handler
│   │   ├── router/index.ts          # Mount tất cả routes dưới /api
│   │   ├── configs/                 # db, cloudinary, sockets config, constants
│   │   ├── middlewares/             # auth (verifyToken/Role/Tenant...), multer, rateLimit
│   │   ├── models/
│   │   │   ├── DB_Connection.ts     # Mongoose connection (Atlas)
│   │   │   └── Schema/              # 16 MongoDB schemas (User, Restaurant, Order...)
│   │   ├── modules/                 # 16 modules — mỗi module: *.routes.ts + *.controller.ts + *.service.ts
│   │   │   ├── AuthModule/          #   đăng ký/đăng nhập/refresh/switch-tenant/users CRUD
│   │   │   ├── RestaurantModule/    #   nhà hàng (tenant) CRUD
│   │   │   ├── TableModule/         #   bàn + QR
│   │   │   ├── ReservationModule/   #   đặt chỗ
│   │   │   ├── MenuModule/          #   danh mục + món ăn
│   │   │   ├── OrderModule/         #   order + POS + order.handler.ts (socket)
│   │   │   ├── PaymentModule/       #   thanh toán + payos.service.ts + payment.handler.ts
│   │   │   ├── UploadModule/        #   upload Cloudinary
│   │   │   ├── Notification/        #   thông báo realtime
│   │   │   ├── AnalyticModule/      #   báo cáo doanh thu
│   │   │   ├── SettingModule/       #   cài đặt nhà hàng + KDS code + gateway
│   │   │   ├── AuditLogModule/      #   audit log (super-admin / admin)
│   │   │   ├── SubscriptionModule/  #   thuê bao + pricing
│   │   │   ├── SuperAdminModule/    #   dashboard nền tảng, block owner
│   │   │   └── MessageModule/       #   chat nội bộ (conversation + message + handler socket)
│   │   ├── sockets/index.ts         # initSocket: authenticate + rooms + presence
│   │   ├── services/                # service dùng chung (auditLog, subscription, subscription-pay)
│   │   └── shared/type.ts           # type dùng chung
│   ├── scripts/                     # backup.sh, reset-super-admin.mjs, seed-test-accounts.mjs
│   ├── src/scripts/migrate-tenant.ts
│   ├── src/test/                    # 30 test files (Vitest + mongodb-memory-server)
│   ├── .env.example
│   └── package.json
│
├── client/                          # Frontend — React + Vite
│   ├── src/
│   │   ├── App.tsx                  # Routing theo role (public/customer/admin/manager/staff/super-admin/kds)
│   │   ├── api/                     # 17 API modules (auth, order, message, payment...)
│   │   ├── pages/
│   │   │   ├── Landing/             # Landing page + AuthModal (login/register owner) + Pricing/Guide/FAQ/Contact
│   │   │   ├── Auth/                # Onboarding, KDS
│   │   │   ├── Customer/            # Menu, Product detail, Cart, Payment, Reservation, Account
│   │   │   ├── Admin/               # Dashboard, Restaurants, Billing, Users, Products, Orders, Reports, Logs
│   │   │   ├── Manager/             # Menu items, POS, Orders, Tables, Reservations, Staff, Analytics
│   │   │   └── SuperAdmin/          # Tenants, Pricing, Transactions, Audit
│   │   ├── layouts/                 # LayoutAdmin, LayoutBlank, LayoutCustomer, LayoutSuperAdmin (+ MessagingProvider)
│   │   ├── components/              # Header (MailBoxPopover chat), Sidebar, UI (shadcn)...
│   │   ├── hooks/                   # ~30 hooks (use-auth, use-socket, use-messaging, use-order...)
│   │   ├── redux/                   # store + slices: auth, cart, restaurant, upsell
│   │   ├── configs/                 # socket.io client config
│   │   ├── constants/               # BASE_URL, server URL...
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── utils/ + lib/            # Helper functions
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
│
├── e2e/                             # Playwright E2E (21 specs)
├── .github/workflows/ci.yml         # CI: server + client + e2e
├── docs/                            # Hướng dẫn vận hành, quy ước issue-tracker
├── MISSION.md / NOTES.md / OPS.md   # Ghi chú vận hành & học tập
├── learning-records/                # Nhật ký học tập (CI/CD...)
└── package.json                     # Root scripts (test, format...)
```

---

## Tính năng chính

### Xác thực & Phân quyền

- Đăng ký khách / chủ nhà hàng (`/register`, `/register-owner`), đăng nhập với JWT (access + refresh token).
- Phân quyền theo role: `customer`, `staff`, `manager`, `admin`, `super-admin`, `kds` (màn hình bếp).
- Middleware `verifyRole(...roles)` bảo vệ route nhạy cảm; `verifyTenant` / `requireResourceTenant` đảm bảo cô lập dữ liệu theo tenant.
- Tenant switcher `POST /api/auth/switch-tenant` cho user thuộc nhiều nhà hàng.
- Reset / đổi mật khẩu, cập nhật hồ sơ.

### Quản lý nhà hàng

- CRUD nhà hàng (admin), danh sách nhà hàng của admin/manager (`GET /api/restaurants/my`).
- Super-admin khoá/mở nhà hàng (`PATCH /api/restaurants/status/:id`) — khi bị khoá mọi request của tenant bị chặn 403.
- Cài đặt cấu hình nhà hàng (giờ mở cửa, phương thức thanh toán, PayOS keys, in ấn, KDS).

### Quản lý bàn

- Thêm/sửa/xóa bàn theo nhà hàng (manager/admin), tự render QR bàn.
- Cập nhật trạng thái bàn (available, occupied, reserved).

### Đặt chỗ (Reservation)

- Khách đặt chỗ online; xem nhà hàng còn bàn trống & khung giờ trống.
- Nhân viên tạo đặt chỗ thay khách (`/create-by-staff`).
- Cập nhật / hủy đặt chỗ, theo dõi lịch sử cá nhân.

### Quản lý menu

- Danh mục món ăn (category) theo nhà hàng; CRUD món ăn kèm ảnh upload.
- Bật/tắt availability; danh sách món bán chạy (bestsellers); món available cho khách.

### Quản lý order & POS

- Tạo order theo bàn / đặt chỗ / online; thêm món vào order.
- Cập nhật trạng thái từng item: `pending → preparing → served` — realtime tới bếp và bàn.
- POS (`/manager/orders/pos`, `/staff/orders/pos`), order management, upsell (cartSlice).
- Xem order active theo thời gian thực; lịch sử đơn của khách.

### Chat nội bộ (Messaging)

- Chat giữa staff/manager/admin trong cùng chuỗi nhà hàng.
- Hội thoại direct (1-1) và group (chỉ manager/admin tạo group).
- Realtime qua Socket.IO: `send_message` / `new_message`, typing indicator, online presence, `conversation_updated`.
- Hộp thư (MailBoxPopover) trên Header, badge tin chưa đọc, đánh dấu đã đọc, thêm/gỡ thành viên group.

### Thanh toán

- Khởi tạo thanh toán cho order; chọn phương thức: tiền mặt, chuyển khoản (PayOS), VNPAY (sandbox).
- PayOS theo tenant (per-tenant key); gateway mặc định do super-admin cấu hình.
- Webhook xử lý xác nhận thanh toán tự động; hủy link PayOS; kiểm tra kết nối PayOS.
- Thanh toán thuê bao (subscription) cho chủ nhà hàng.

### Upload ảnh

- Upload đơn / nhiều ảnh (tối đa 5) lên Cloudinary.
- Folder phân vùng theo tenant: `restaurants/<restaurantId>/...`; xoá có kiểm tra ownership.

### Thông báo

- Thông báo realtime qua Socket.IO (`new_notification`), xem theo nhà hàng / toàn chuỗi.
- Đánh dấu đã đọc từng thông báo hoặc tất cả.

### Báo cáo & Phân tích

- Tổng quan doanh thu, doanh thu theo giờ, kênh đặt hàng, doanh thu từng chi nhánh (manager/admin).
- Dashboard gộp toàn hệ thống (super-admin): `system-overview`, `revenue-channels`.

### Subscription & Super Admin

- Thuê bao: thanh toán/gia hạn, trạng thái, lịch sử giao dịch (admin).
- Pricing config (super-admin): `GET/PUT /api/pricing` + `admin/pricing`.
- Super Admin: dashboard, tenants, transactions, block owner, gateway settings, audit log, system analytics.

### KDS (Kitchen Display System)

- Màn hình bếp tại `/kds`, xác thực bằng mã nhà bếp 6 chữ số (không cần đăng nhập) qua `POST /api/settings/kds/verify`.
- Chỉ nhận event order của đúng nhà hàng; token KDS gắn `restaurantId`.

### Audit Log

- Ghi nhật ký thao tác của staff/manager/admin (auditLog service).
- Super-admin xem toàn nền tảng, admin xem theo chi nhánh chuỗi (`GET /api/audit-logs`, `/api/audit-logs/payments`).

---

## Cài đặt & Chạy

### Yêu cầu hệ thống

- Node.js >= 18
- MongoDB (URI kết nối — local hoặc Atlas)
- Tài khoản Cloudinary
- Tài khoản PayOS và/hoặc VNPAY (sandbox)

### 1. Clone repository

```bash
git clone https://github.com/daidat02/Restaurant-Management.git
cd Restaurant-Management
```

### 2. Cài đặt & chạy Server

```bash
cd server
npm install

# Tạo file .env (xem phần Biến môi trường bên dưới)
cp .env.example .env

# Chạy development (tsc --watch + nodemon)
npm run dev
```

Server mặc định chạy tại `http://localhost:8000`.

> Trong `.env`, để dev đăng nhập bằng test accounts, hãy seed DB trước:
> ```bash
> node scripts/seed-test-accounts.mjs
> ```

### 3. Cài đặt & chạy Client

```bash
cd ../client
npm install

# Tạo file .env
cp .env.example .env

# Chạy development server
npm run dev
```

Client mặc định chạy tại `http://localhost:5173`, gọi API qua `VITE_SERVER_BASE_URL` (mặc định `http://localhost:8000`).

### 4. Build production

```bash
# Server
cd server && npm run build   # Compile TypeScript → dist/

# Client
cd client && npm run build   # Build → dist/
```

### 5. Chạy test

```bash
# Backend (30 test files, 257 tests)
cd server && npm test

# E2E (21 specs, yêu cầu server + client đang chạy)
npm run test:e2e   # từ thư mục root
```

---

## Biến môi trường

### Server — `server/.env`

```env
# ============ SERVER ============
PORT=8000

# ============ DATABASE (MongoDB Atlas) ============
MONGODB_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# ============ CORS (comma-separated, không space) ============
# Prod: https://<client>.vercel.app — Dev: http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173

# ============ JWT ============
# Sinh secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_EXPIRES_IN=30m
JWT_COOKIE_EXPIRES_IN=7

# ============ CLOUDINARY ============
CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
CLOUDINARY_NAME=<cloud_name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# ============ VNPAY (sandbox) ============
VNP_HASHSECRET_KEY=change-me
VNP_TMNCODE=change-me
VNP_URL=https://sandbox.vnpay.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:8000/api/payments/vnpay-return

# ============ SENTRY (OPTIONAL — bỏ trống để không bật) ============
SENTRY_DSN=
```

> PayOS key KHÔNG đặt trong env — lưu trong cài đặt của từng nhà hàng (`settings.integrations.payOS`), mã hoá `apiKey`/`checksumKey`.

### Client — `client/.env`

```env
VITE_BASE_URL=http://localhost:5173
VITE_SERVER_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=
```

> ⚠️ File `.env` đã có trong `.gitignore`. Tuyệt đối không commit file này lên VCS.

---

## API Reference

Tất cả API có prefix `/api` (`app.use('/api', router)`), trả JSON. Middleware cần đăng nhập: `Authorization: Bearer <accessToken>`.

### Authentication — `/api/auth`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/register` | Đăng ký tài khoản khách | Public |
| POST | `/register-owner` | Đăng ký chủ nhà hàng | Public |
| POST | `/login` | Đăng nhập, nhận token | Public |
| POST | `/refresh` | Làm mới access token | Public |
| POST | `/switch-tenant` | Chuyển tenant hiện tại | User |
| GET | `/profile/me` | Hồ sơ cá nhân | User |
| PATCH | `/update/me` | Cập nhật hồ sơ | User |
| POST | `/reset-password` | Cập nhật mật khẩu | User |
| POST | `/change-password` | Đổi mật khẩu | User |
| GET | `/profile/:id` | Chi tiết user | Manager/Admin |
| GET | `/` | Danh sách users (lọc theo tenant) | Manager/Admin |
| PUT | `/admin/update/:id` | Cập nhật user | Manager/Admin |
| DELETE | `/admin/delete/:id` | Xóa user | Manager/Admin |
| POST | `/admin/create` | Tạo staff/manager (wizard onboarding) | Manager/Admin |

### Restaurants — `/api/restaurants`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/` | Tạo nhà hàng | Admin |
| GET | `/` | Danh sách nhà hàng | Public |
| GET | `/my` | Nhà hàng của admin/manager đang đăng nhập | Manager/Admin |
| GET | `/:id` | Chi tiết nhà hàng | User |
| PUT | `/update/:id` | Cập nhật nhà hàng | Admin |
| PATCH | `/status/:id` | Khoá/mở nhà hàng | Super Admin |
| DELETE | `/:id` | Xóa nhà hàng | Admin |

### Tables — `/api/tables`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/create` | Tạo bàn | Manager/Admin |
| GET | `/:id` | Chi tiết bàn | Public |
| PUT | `/:id` | Cập nhật bàn | Manager/Admin |
| DELETE | `/:id` | Xóa bàn | Manager/Admin |
| GET | `/restaurant/:restaurantId` | Bàn theo nhà hàng | Staff/Manager/Admin |
| PATCH | `/:id/status` | Cập nhật trạng thái bàn | Staff/Manager/Admin |

### Reservations — `/api/reservations`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/create` | Khách đặt chỗ | Public |
| POST | `/create-by-staff` | Nhân viên đặt chỗ | Staff/Manager |
| GET | `/restaurants` | Nhà hàng còn bàn trống | Public |
| GET | `/tables/slots` | Khung giờ trống | Public |
| GET | `/:id/restaurant` | Đặt chỗ theo nhà hàng | Staff/Manager |
| GET | `/me` | Đặt chỗ của tôi | Customer |
| GET | `/:id` | Chi tiết đặt chỗ | Admin/Staff |
| PUT | `/update/:id` | Cập nhật đặt chỗ | Staff/Manager/Admin |
| PUT | `/update-status/:id` | Cập nhật trạng thái | Staff/Manager/Admin |
| PUT | `/cancel/:id` | Hủy đặt chỗ | Customer/Staff/Admin |

### Menu — `/api/menu`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/category` | Tạo danh mục | Manager/Admin |
| PUT | `/category/:id` | Cập nhật danh mục | Manager/Admin |
| GET | `/category/:restaurantId` | Danh mục theo nhà hàng | Public |
| POST | `/item` | Tạo món ăn | Manager |
| PUT | `/item/:id` | Cập nhật món ăn | Manager/Admin |
| PUT | `/item/:id/availability` | Bật/tắt món | Staff/Manager/Admin |
| GET | `/item/category/:catId` | Món theo danh mục | Public |
| GET | `/items/:restaurantId` | Tất cả món của nhà hàng | Public |
| GET | `/item/available/:restaurantId` | Món đang bán | Public |
| GET | `/items/bestsellers/:restaurantId` | Món bán chạy | Public |
| GET | `/item/:id` | Chi tiết món | Public |

### Orders — `/api/orders`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/` | Tạo order | Public (rate limit) |
| POST | `/add-item` | Thêm món vào order | Public (rate limit) |
| POST | `/item/:itemId/:status` | Cập nhật trạng thái item | User |
| GET | `/my-orders` | Đơn của tôi | Customer |
| GET | `/:id` | Chi tiết order | User (tenant) |
| GET | `/restaurant/:id/:status` | Đơn theo nhà hàng + trạng thái | User (tenant) |
| GET | `/restaurant/:id` | Đơn theo nhà hàng | User (tenant) |
| GET | `/active/:restaurantId` | Đơn đang active | User (tenant) |
| GET | `/table/:tableId` | Đơn theo bàn | Public |
| PUT | `/:id` | Cập nhật order | Staff/Manager |
| PUT | `/:id/status` | Cập nhật trạng thái order | Staff/Manager |

### Payments — `/api/payments`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/:paymentId` | Chi tiết thanh toán | User (tenant) |
| POST | `/initiate` | Khởi tạo thanh toán | User |
| POST | `/:paymentId/method/:method` | Chọn phương thức TT | User |
| PATCH | `/status` | Cập nhật trạng thái TT | User |
| POST | `/ewallet/:orderId` | Tạo URL VNPAY | Staff/Customer |
| POST | `/banking/:orderId` | Tạo PayOS URL | Public (rate limit) |
| POST | `/return/vnpay` | Return URL từ VNPAY | Public |
| POST | `/webhook` | Webhook PayOS | Public |
| POST | `/:orderId/cancel` | Hủy link PayOS | Public |
| POST | `/check-connect` | Kiểm tra kết nối PayOS | Public |

### Upload — `/api/upload`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/` | Upload 1 ảnh (field: `image`) | User |
| POST | `/multiple` | Upload nhiều ảnh (field: `images`, max 5) | User |
| DELETE | `/` | Xóa ảnh theo URL | User |

### Notifications — `/api/notifications`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/` | Thông báo toàn chuỗi (admin) | User |
| GET | `/:restaurantId` | Thông báo theo nhà hàng | User (tenant) |
| PATCH | `/:id/read` | Đánh dấu đã đọc | User |
| POST | `/read-all/:restaurantId` | Đánh dấu tất cả đã đọc | User (tenant) |

### Analytics — `/api/analytics`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/overview` | Tổng quan doanh thu | Manager/Admin |
| GET | `/revenue-hourly` | Doanh thu theo giờ | Manager/Admin |
| GET | `/order-channels` | Thống kê kênh đặt hàng | Manager/Admin |
| GET | `/revenue-branches` | Doanh thu từng chi nhánh | Manager/Admin |
| GET | `/revenue-channels` | Doanh thu theo kênh | Super Admin |
| GET | `/system-overview` | Dashboard gộp hệ thống | Super Admin |

### Settings — `/api/settings`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/create` | Tạo cài đặt | Admin |
| POST | `/kds/verify` | Xác thực mã nhà bếp | Public |
| POST | `/:id/kds-code` | Tạo mã nhà bếp mới | Manager/Admin |
| GET | `/get-or-create/:scope/:model/:targetId` | Lấy hoặc tạo cài đặt | Admin |
| GET | `/gateway` | Lấy gateway config | Super Admin |
| PUT | `/gateway` | Cập nhật gateway config | Super Admin |
| GET | `/:id` | Chi tiết cài đặt | Staff/Manager/Admin |
| PUT | `/:id` | Cập nhật cài đặt | Manager/Admin |
| PATCH | `/:id/payment-method` | Cập nhật PTTT | Manager/Admin |
| DELETE | `/:id` | Xóa cài đặt | Admin |

### Subscriptions — `/api/subscriptions`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | `/pay` | Thanh toán / gia hạn thuê bao | Admin |
| GET | `/me` | Trạng thái thuê bao của chủ | Admin |
| GET | `/transactions` | Lịch sử giao dịch của chủ | Admin |

### Pricing — `/api/pricing`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/pricing` | Lấy pricing config | User |
| PUT | `/admin/pricing` | Cập nhật pricing | Super Admin |

### Super Admin — `/api/admin`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/admin/dashboard` | Dashboard nền tảng | Super Admin |
| GET | `/admin/tenants` | Danh sách tenants | Super Admin |
| GET | `/admin/transactions` | Transactions toàn hệ thống | Super Admin |
| PATCH | `/admin/users/:id/block` | Khoá/mở chủ nhà hàng | Super Admin |

### Audit Logs — `/api/audit-logs`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/` | Nhật ký thao tác (super-admin / admin theo chuỗi) | Super Admin/Admin |
| GET | `/payments` | Lịch sử thanh toán các chi nhánh | Admin |

### Conversations (Chat) — `/api/conversations`

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/` | Danh sách hội thoại của user (toàn chuỗi) | Staff/Manager/Admin |
| POST | `/` | Tạo hội thoại direct/group | Staff/Manager/Admin |
| GET | `/:id/messages` | Lịch sử tin nhắn (phân trang) | Member (tenant) |
| POST | `/:id/messages` | Gửi tin nhắn | Member (tenant) |
| POST | `/:id/read` | Đánh dấu đã đọc | Member (tenant) |
| POST | `/:id/members` | Thêm member vào group | Manager/Admin |
| DELETE | `/:id/members/:userId` | Gỡ member khỏi group | Manager/Admin |

### Ký hiệu

- **Public** — không cần token
- **User** — cần đăng nhập
- **Staff/Manager/Admin** — bất kỳ role nào trong nhóm
- **Manager/Admin** — role manager hoặc admin
- **Admin** — chỉ admin
- **Super Admin** — chỉ super-admin
- **tenant** — truy cập bị lọc theo `restaurantId` trong token

---

## Realtime với Socket.IO

Server khởi tạo Socket.IO trong `src/index.ts` (`ResgisterSocketIO` trong `src/sockets/index.ts`). Mọi kết nối phải xác thực token (`io.use(authenticateToken)`); token là access token của user hoặc token KDS.

### Phòng (rooms)

| Room | Mô tả |
| --- | --- |
| `restaurant_<id>` | Phòng tenant — order, notification, presence |
| `conversation_<id>` | Phòng chat của một hội thoại |
| `user_<id>` | Phòng cá nhân — cập nhật hội thoại, presence |
| `payment_<id>` | Phòng theo dõi thanh toán |

### Events Client → Server

| Event | Payload | Mô tả |
| --- | --- | --- |
| `init_room_restaurant` | `restaurantId` | Tham gia phòng tenant (kiểm tra membership) |
| `leave_restaurant` | `restaurantId` | Rời phòng tenant |
| `init_orders` | `restaurantId` | (order.handler) tham gia phòng tenant |
| `join_order` | `orderId` | Theo dõi 1 order |
| `leave_orders` / `leave_order` | — | Rời phòng order |
| `subscribe_payment` | `paymentId` | Theo dõi thanh toán |
| `unsubscribe_payment` | `paymentId` | Hủy theo dõi thanh toán |
| `join_conversation` | `conversationId` | Vào phòng chat (kiểm tra membership + tenant) |
| `leave_conversation` | `conversationId` | Rời phòng chat |
| `send_message` | `{ conversationId, text }` | Gửi tin nhắn (có ack) |
| `typing` | `{ conversationId, isTyping }` | Trạng thái đang gõ |

### Events Server → Client

| Event | Mô tả |
| --- | --- |
| `room_error` | Bị từ chối vào room (không thuộc tenant / không phải member) |
| `user_online` / `user_offline` | Presence — online indicator trong chat |
| `order_event` | Cập nhật order theo tenant |
| `new_notification` | Thông báo mới theo tenant |
| `new_Notification` | Thông báo mới (đặt chỗ/order) |
| `payment_success` | Thanh toán thành công (room `payment_<id>`) |
| `new_message` | Tin nhắn mới trong hội thoại |
| `conversation_updated` | Hội thoại thay đổi (tên/lastMessage/memberCount/read) |
| `typing` | Ai đó đang gõ |

> **Cô lập tenant:** client non-customer tự động join phòng `restaurant_<id>` của các nhà hàng mình thuộc; server emit luôn qua `io.to(room)` — không bao giờ dùng global `emit()`. Kết nối với nhà hàng không thuộc quyền bị từ chối (`room_error`).

### Client kết nối

```typescript
import { socket, connectSocketWithAuth } from '@/configs/socket.io';

connectSocketWithAuth(accessToken); // set auth.token + connect

socket.emit('init_room_restaurant', restaurantId); // vào phòng tenant

socket.on('order_event', (data) => { /* cập nhật đơn hàng */ });
```

---

## Chat nội bộ (Messaging)

Phân hệ chat dành cho **staff/manager/admin** trong cùng chuỗi nhà hàng (`restaurantIds`).

### Kiến trúc

- **REST** (`/api/conversations`) — CRUD hội thoại, lịch sử tin nhắn, đánh dấu đọc, quản lý member.
- **Socket** (`send_message`) — gửi tin realtime kèm ack để thay tin tạm optimistic; broadcast `new_message` cho các socket khác trong `conversation_<id>`.
- **Client** — `MessagingProvider` (bọc trong `LayoutAdmin` + `LayoutSuperAdmin`) cung cấp `useMessaging()`; hộp thư `MailBoxPopover` trên `Header`.
- **Presence** — user online/offline qua `user_online`/`user_offline` trên các phòng tenant.

### Luồng gửi tin

1. Client emit `send_message` với `{ conversationId, text }` — server persist, ack tin thật (thay tin tạm), broadcast `new_message` tới các socket khác trong `conversation_<id>`.
2. `conversation_updated` được emit tới `user_<memberId>` của các member để cập nhật `lastMessage`, `memberCount`, `readBy`.
3. Admin (chủ chuỗi) xem hội thoại toàn chuỗi; group chỉ manager/admin được thêm/gỡ member.

---

## Luồng nghiệp vụ

### 1. Authentication Flow

```
Client                          Server
  │                               │
  ├── POST /api/auth/register ──→ │ Hash password, lưu DB
  │                               │
  ├── POST /api/auth/login ─────→ │ Verify credentials
  │ ←── { accessToken, refreshToken } │
  │                               │
  ├── GET /api/* (Authorization: Bearer <token>) ──→ │
  │                               │ verifyToken → req.user
  │                               │ verifyTenant → req.tenantId (từ JWT claim)
  │                               │
  │ (Token hết hạn)               │
  ├── POST /api/auth/refresh ───→ │ Verify refreshToken → accessToken mới
```

### 2. Đặt chỗ (Customer)

```
1. GET  /api/reservations/tables/slots?restaurantId=...&date=...
   → Xem khung giờ còn trống

2. POST /api/reservations/create
   Body: { restaurantId, tableId, date, time, guestCount, note }

3. Nhân viên nhận thông báo realtime (new_Notification)
   → Xác nhận / hủy qua PUT /api/reservations/update-status/:id
```

### 3. Order & Phục vụ (Staff)

```
1. POST /api/orders
   Body: { tableId, restaurantId }

2. POST /api/orders/add-item
   Body: { orderId, menuItemId, quantity, note }

3. POST /api/orders/item/:itemId/preparing
   → pending → preparing (realtime tới KDS)

4. POST /api/orders/item/:itemId/served
   → preparing → served

5. PUT /api/orders/:id/status (completed)
   → Hoàn thành order
```

### 4. Thanh toán

```
Tiền mặt:
1. POST /api/payments/initiate { orderId }
2. PATCH /api/payments/status { paymentId, status: "paid" }

Chuyển khoản (PayOS — key theo tenant):
1. POST /api/payments/banking/:orderId → { checkoutUrl }
2. Redirect khách đến checkoutUrl
3. PayOS gọi webhook → POST /api/payments/webhook
   → Server tự cập nhật trạng thái, emit payment_success + order_event

VNPAY (sandbox):
1. POST /api/payments/ewallet/:orderId → { paymentUrl }
2. Redirect khách đến paymentUrl
3. VNPAY redirect về → POST /api/payments/return/vnpay
```

---

## Tích hợp thanh toán

### PayOS (chuyển khoản ngân hàng / QR)

- Key theo từng tenant trong cài đặt nhà hàng (`settings.integrations.payOS`), mã hoá apiKey/checksumKey.
- Tạo link: `POST /api/payments/banking/:orderId` → `{ checkoutUrl, orderCode }`.
- Webhook tự động: `POST /api/payments/webhook` — xác thực signature, cập nhật trạng thái, emit `payment_success` + `order_event`.
- Hủy link: `POST /api/payments/:orderId/cancel`; kiểm tra kết nối: `POST /api/payments/check-connect`.
- Gateway mặc định do super-admin đặt qua `GET/PUT /api/settings/gateway`.

### VNPAY

- Sandbox: `VNP_URL=https://sandbox.vnpay.vn/paymentv2/vpcpay.html`, `VNP_RETURN_URL=http://localhost:8000/api/payments/vnpay-return`.
- Tạo URL: `POST /api/payments/ewallet/:orderId` → `{ paymentUrl }`; xử lý return tại `POST /api/payments/return/vnpay`.

---

## Bảo mật

### Authentication

- JWT: access token ngắn hạn (`JWT_EXPIRES_IN=30m`) + refresh token dài hạn (`JWT_COOKIE_EXPIRES_IN=7` ngày).
- Refresh token lưu HTTP-only cookie để tránh XSS.
- Middleware `verifyToken` kiểm tra signature + expiry.

### Authorization

- `verifyRole(...roles)` kiểm tra quyền truy cập.
- `verifyTenant` / `requireResourceTenant(<resolver>)` đảm bảo cô lập dữ liệu theo tenant (token claim, không tin param từ client).
- Người dùng chỉ truy cập data của nhà hàng họ thuộc (`restaurantIds`); chat chỉ member mới vào được `conversation_<id>`.
- Nhà hàng bị super-admin khoá (`status: inactive`) → mọi request của tenant đó bị chặn 403.
- Upload xoá chéo tenant bị chặn theo folder ownership.

### Bảo vệ thông tin nhạy cảm

- Không commit `.env` lên VCS (đã trong `.gitignore`).
- PayOS key mã hoá khi lưu; các secret khác chỉ trong biến môi trường.
- Webhook thanh toán xác thực signature trước khi xử lý.
- Rate limit cho các route công khai nhạy cảm (auth, order create, menu read, webhook, KDS verify).

### Các best practices

```bash
# File bị ignore bởi .gitignore
**/node_modules/
client/dist/
server/dist/
**/.env
**/.env.local
*.log
.DS_Store
```

---

## Test & CI/CD

### Backend tests (server)

- **Framework:** Vitest + supertest + mongodb-memory-server.
- **Số lượng:** 30 test files / 257 tests pass.
- Chạy: `cd server && npm test`.

### E2E tests

- **Framework:** Playwright — 21 specs (`e2e/`), cần server + client đang chạy.
- Chạy từ root: `npm run test:e2e`.

### CI/CD (`.github/workflows/ci.yml`)

Chạy trên nhánh `main` và `feature/**` với 3 job:

1. **server** — `npm ci` → typecheck → test → build.
2. **client** — `npm ci` → typecheck → lint (baseline) → build.
3. **e2e** — dựng server + client → chạy Playwright specs.

---

## Triển khai (Deployment)

### Frontend — Vercel

```bash
npm i -g vercel
cd client
vercel --prod
```

Hoặc kết nối GitHub repo với Vercel Dashboard để auto-deploy khi push.

> Build command: `npm run build` — Output directory: `dist` — Env: `VITE_SERVER_BASE_URL=https://<server>.onrender.com`

### Backend — Render

```bash
cd server
npm run build
node dist/index.js
```

**Biến môi trường cần set trên server production:** toàn bộ biến trong `server/.env` + `NODE_ENV=production` + `PORT` (do platform cung cấp) + `ALLOWED_ORIGINS` = URL client Vercel.

### Database

- MongoDB Atlas (production) — connection string trong `MONGODB_URL`.

---

## Đóng góp

Mọi đóng góp đều được chào đón:

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi: `git commit -m 'feat: mô tả tính năng'`
4. Push lên branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

### Quy ước commit

```
feat:     Tính năng mới
fix:      Sửa bug
docs:     Cập nhật tài liệu
style:    Thay đổi format/style (không ảnh hưởng logic)
refactor: Tái cấu trúc code
test:     Thêm/sửa test
chore:    Cập nhật build tools, dependencies
```

---

## Tác giả

**datnd.02** — [@daidat02](https://github.com/daidat02)
