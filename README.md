# 🍽️ Restaurant Management System

> Hệ thống quản lý nhà hàng full-stack với Node.js + Express + TypeScript (backend) và React + Vite (frontend). Hỗ trợ quản lý bàn, đặt chỗ, menu, order, thanh toán trực tuyến, upload ảnh, thông báo realtime và báo cáo phân tích.

🔗 **Live Demo:** [nhamnhitidi.vercel.app](https://nhamnhitidi.vercel.app/)
📁 **Repository:** [github.com/daidat02/Restaurant-Management](https://github.com/daidat02/Restaurant-Management)

👥 **Tài khoản dùng thử (Test Accounts):**

- **Quản trị viên(Admin):** `admin@gmail.com` / Mật khẩu: `123456`
- **Quản lý (Manager):** `manager@gmail.com` / Mật khẩu: `123456`
- **Nhân viên (Staff):** `staff@gmail.com` / Mật khẩu: `123456`
- **Khách hàng (Customer):** `customer@gmail.com` / Mật khẩu: `123456`

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Tính năng chính](#-tính-năng-chính)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Biến môi trường](#-biến-môi-trường)
- [API Reference](#-api-reference)
- [Luồng nghiệp vụ](#-luồng-nghiệp-vụ)
- [Realtime với Socket.IO](#-realtime-với-socketio)
- [Tích hợp thanh toán](#-tích-hợp-thanh-toán)
- [Bảo mật](#-bảo-mật)
- [Triển khai (Deployment)](#-triển-khai-deployment)
- [Tác giả](#-tác-giả)

---

## 🌟 Tổng quan

Restaurant Management System là ứng dụng web full-stack phục vụ quản lý toàn diện hoạt động nhà hàng. Hệ thống bao gồm:

- **Khách hàng (Customer):** Xem menu, đặt bàn trực tuyến, theo dõi đơn hàng, thanh toán online.
- **Nhân viên (Staff):** Tiếp nhận đặt chỗ, quản lý order tại bàn, cập nhật trạng thái món ăn.
- **Quản lý (Manager):** Xem báo cáo doanh thu, quản lý menu, bàn, nhân viên và cài đặt nhà hàng.
- **Admin:** Toàn quyền quản trị hệ thống, thêm/xóa nhà hàng, phân quyền người dùng.

---

## 🛠️ Công nghệ sử dụng

### Backend (Server)

| Công nghệ         | Mục đích                                     |
| ----------------- | -------------------------------------------- |
| Node.js + Express | REST API framework                           |
| TypeScript        | Type safety, code quality                    |
| MongoDB           | Database chính (NoSQL)                       |
| Socket.IO         | Realtime notifications & order updates       |
| JWT               | Xác thực & phân quyền (access/refresh token) |
| Cloudinary        | Lưu trữ và quản lý ảnh                       |
| PayOS             | Thanh toán qua ngân hàng (VN)                |
| VNPAY             | Cổng thanh toán điện tử                      |

### Frontend (Client)

| Công nghệ        | Mục đích                    |
| ---------------- | --------------------------- |
| React + Vite     | UI framework, build tool    |
| TypeScript       | Type safety                 |
| Ant Design Icons | Icon library                |
| Socket.IO Client | Kết nối realtime với server |

### DevOps & Công cụ

| Công nghệ             | Mục đích                     |
| --------------------- | ---------------------------- |
| Vercel                | Deploy frontend              |
| nodemon + tsc --watch | Hot reload trong development |
| .gitignore            | Bảo vệ file nhạy cảm         |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React + Vite)                   │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Pages /  │  │  Components  │  │  Socket.IO Client         │ │
│  │  Routes   │  │  (UI)        │  │  (Realtime updates)       │ │
│  └─────┬─────┘  └──────┬───────┘  └─────────────┬─────────────┘ │
│        └───────────────┴──────────────────────────┘             │
│                         HTTP + WebSocket                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ proxy → http://localhost:8000
┌────────────────────────────▼────────────────────────────────────┐
│                   SERVER (Express + TypeScript)                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  Routes  │→ │Middleware│→ │Controllers│→ │    Services   │   │
│  │ /api/*   │  │ JWT Auth │  │  (Logic) │  │ (Business)    │   │
│  └──────────┘  │ verifyRole│  └──────────┘  └───────┬───────┘   │
│                └──────────┘                         │           │
│                                                     ▼           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Socket.IO  │  │  Cloudinary  │  │    MongoDB           │   │
│  │  (Realtime) │  │  (Images)    │  │    (Database)        │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Payment Gateways: PayOS / VNPAY                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc thư mục

```
Restaurant-Management/
├── client/                        # Frontend - React + Vite
│   ├── src/
│   │   ├── assets/                # Hình ảnh, icon tĩnh
│   │   ├── components/            # UI components dùng chung
│   │   ├── layouts/               # Layout wrapper (admin, customer...)
│   │   ├── pages/                 # Các trang chính
│   │   │   ├── auth/              # Đăng nhập, đăng ký
│   │   │   ├── customer/          # Giao diện khách hàng
│   │   │   ├── staff/             # Giao diện nhân viên
│   │   │   ├── manager/           # Dashboard quản lý
│   │   │   └── admin/             # Trang quản trị
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── contexts/              # React Context (auth, socket...)
│   │   ├── services/              # Axios API calls
│   │   ├── types/                 # TypeScript interfaces/types
│   │   ├── utils/                 # Helper functions
│   │   ├── routes/                # Cấu hình routing
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json               # proxy → http://localhost:8000
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                        # Backend - Node.js + Express + TS
│   ├── src/
│   │   ├── index.ts               # Entry point (Express + Socket.IO init)
│   │   ├── routes/                # Định nghĩa route
│   │   │   ├── auth.route.ts
│   │   │   ├── restaurant.route.ts
│   │   │   ├── table.route.ts
│   │   │   ├── reservation.route.ts
│   │   │   ├── menu.route.ts
│   │   │   ├── order.route.ts
│   │   │   ├── payment.route.ts
│   │   │   ├── upload.route.ts
│   │   │   ├── notification.route.ts
│   │   │   ├── analytics.route.ts
│   │   │   └── settings.route.ts
│   │   ├── controllers/           # Xử lý logic request/response
│   │   ├── services/              # Business logic layer
│   │   ├── models/                # MongoDB schemas (Mongoose)
│   │   │   ├── user.model.ts
│   │   │   ├── restaurant.model.ts
│   │   │   ├── table.model.ts
│   │   │   ├── reservation.model.ts
│   │   │   ├── menu.model.ts
│   │   │   ├── order.model.ts
│   │   │   ├── payment.model.ts
│   │   │   └── notification.model.ts
│   │   ├── middleware/            # Auth, role guard, error handler
│   │   │   ├── auth.middleware.ts  # verifyToken, verifyRole
│   │   │   └── error.middleware.ts
│   │   ├── socket/                # Socket.IO event handlers
│   │   │   └── index.ts           # initSocket()
│   │   ├── config/                # DB connection, Cloudinary config
│   │   ├── utils/                 # Helpers, token generator
│   │   └── types/                 # TypeScript type definitions
│   ├── dist/                      # Compiled JavaScript (auto-generated)
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                   # Root (workspace dependencies)
├── package-lock.json
├── .gitignore
├── README.md                      # Tài liệu tiếng Anh
└── README.VI.md                   # Tài liệu tiếng Việt
```

---

## ✨ Tính năng chính

### 👤 Xác thực & Phân quyền

- Đăng ký / Đăng nhập với JWT (access token + refresh token)
- Phân quyền theo role: `customer`, `staff`, `manager`, `admin`
- Middleware `verifyRole` bảo vệ các route nhạy cảm
- Tự động refresh token khi hết hạn

### 🏪 Quản lý nhà hàng

- CRUD nhà hàng (admin)
- Xem danh sách, chi tiết nhà hàng
- Cài đặt cấu hình nhà hàng (giờ mở cửa, phương thức thanh toán...)

### 🪑 Quản lý bàn

- Thêm/sửa/xóa bàn theo nhà hàng
- Cập nhật trạng thái bàn (available, occupied, reserved)
- Xem danh sách bàn theo nhà hàng

### 📅 Đặt chỗ (Reservation)

- Khách đặt chỗ online với thông tin: nhà hàng, ngày giờ, số người
- Xem khung giờ trống theo nhà hàng
- Nhân viên tạo đặt chỗ thay khách
- Cập nhật / hủy đặt chỗ
- Theo dõi lịch sử đặt chỗ cá nhân

### 🍜 Quản lý menu

- Danh mục món ăn (category) theo nhà hàng
- CRUD món ăn (menu item) với ảnh upload
- Bật/tắt availability của từng món
- Xem danh sách món bán chạy (bestsellers)

### 📦 Quản lý order

- Tạo order theo bàn hoặc đặt chỗ
- Thêm món vào order đang hoạt động
- Cập nhật trạng thái từng item: `pending → preparing → served`
- Xem order active của nhà hàng theo thời gian thực
- Lịch sử đơn hàng của khách

### 💳 Thanh toán

- Khởi tạo thanh toán cho order
- Chọn phương thức: tiền mặt, chuyển khoản (PayOS), VNPAY
- Webhook xử lý xác nhận thanh toán tự động
- Theo dõi trạng thái thanh toán

### 🖼️ Upload ảnh

- Upload ảnh đơn và nhiều ảnh lên Cloudinary
- Xóa ảnh theo URL
- Dùng cho ảnh món ăn, avatar, ảnh nhà hàng

### 🔔 Thông báo

- Thông báo realtime qua Socket.IO
- Xem danh sách thông báo theo nhà hàng
- Đánh dấu đã đọc từng thông báo hoặc tất cả

### 📊 Báo cáo & Phân tích

- Tổng quan doanh thu (overview)
- Doanh thu theo giờ trong ngày
- Thống kê kênh đặt hàng (order channels)
- Thống kê doanh thu theo kênh (revenue channels)

---

## 🚀 Cài đặt & Chạy

### Yêu cầu hệ thống

- Node.js >= 18
- npm hoặc yarn
- MongoDB (URI kết nối)
- Tài khoản [Cloudinary](https://cloudinary.com)
- Tài khoản [PayOS](https://payos.vn) và/hoặc [VNPAY](https://vnpay.vn)

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
cp .env.example .env   # hoặc tạo thủ công

# Chạy development (tsc --watch + nodemon)
npm run start
```

Server mặc định chạy tại `http://localhost:8000`

### 3. Cài đặt & chạy Client

```bash
cd ../client
npm install

# Chạy development server
npm run dev
```

Client mặc định chạy tại `http://localhost:5173`, proxy tới `http://localhost:8000`

### 4. Build production

```bash
# Server
cd server && npm run build   # Compile TypeScript → dist/

# Client
cd client && npm run build   # Build → dist/
```

---

## 🔐 Biến môi trường

Tạo file `server/.env` với các biến sau (không commit giá trị thật vào VCS):

```env
# ============ SERVER ============
PORT=8000
NODE_ENV=development

# ============ DATABASE ============
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# ============ JWT ============
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_COOKIE_EXPIRES_IN=7

# ============ CLOUDINARY ============
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ============ VNPAY ============
VNP_TMNCODE=your_tmncode
VNP_HASHSECRET_KEY=your_hash_secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:8000/api/payments/return/vnpay

# ============ PAYOS ============
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
```

> ⚠️ **Lưu ý bảo mật:** File `.env` đã được thêm vào `.gitignore`. Tuyệt đối không commit file này lên VCS.

---

## 📡 API Reference

Tất cả API có prefix `/api`. Server cấu hình `app.use('/api', router)`.

### 🔐 Authentication — `/api/auth`

| Method | Endpoint            | Mô tả                      | Auth     |
| ------ | ------------------- | -------------------------- | -------- |
| POST   | `/register`         | Đăng ký tài khoản          | ❌       |
| POST   | `/login`            | Đăng nhập, nhận token      | ❌       |
| POST   | `/refresh`          | Làm mới access token       | ❌       |
| GET    | `/profile/me`       | Lấy thông tin cá nhân      | ✅       |
| PATCH  | `/update/me`        | Cập nhật thông tin cá nhân | ✅       |
| GET    | `/`                 | Danh sách users            | 👑 Admin |
| GET    | `/profile/:id`      | Chi tiết user              | 👑 Admin |
| PUT    | `/admin/update/:id` | Cập nhật user              | 👑 Admin |
| DELETE | `/admin/delete/:id` | Xóa user                   | 👑 Admin |

### 🏪 Restaurants — `/api/restaurants`

| Method | Endpoint      | Mô tả              | Auth     |
| ------ | ------------- | ------------------ | -------- |
| POST   | `/`           | Tạo nhà hàng       | 👑 Admin |
| GET    | `/`           | Danh sách nhà hàng | ❌       |
| GET    | `/:id`        | Chi tiết nhà hàng  | ❌       |
| PUT    | `/update/:id` | Cập nhật nhà hàng  | 👑 Admin |
| DELETE | `/:id`        | Xóa nhà hàng       | 👑 Admin |

### 🪑 Tables — `/api/tables`

| Method | Endpoint                    | Mô tả                   | Auth                   |
| ------ | --------------------------- | ----------------------- | ---------------------- |
| POST   | `/create`                   | Tạo bàn                 | 🔧 Manager/Admin       |
| GET    | `/:id`                      | Chi tiết bàn            | ✅                     |
| PUT    | `/:id`                      | Cập nhật bàn            | 🔧 Manager/Admin       |
| DELETE | `/:id`                      | Xóa bàn                 | 🔧 Manager/Admin       |
| GET    | `/restaurant/:restaurantId` | Bàn theo nhà hàng       | ❌                     |
| PATCH  | `/:id/status`               | Cập nhật trạng thái bàn | 👥 Staff/Manager/Admin |

### 📅 Reservations — `/api/reservations`

| Method | Endpoint             | Mô tả                  | Auth           |
| ------ | -------------------- | ---------------------- | -------------- |
| POST   | `/create`            | Khách đặt chỗ          | ✅             |
| POST   | `/create-by-staff`   | Nhân viên đặt chỗ      | 👥 Staff       |
| GET    | `/restaurants`       | Nhà hàng còn bàn trống | ❌             |
| GET    | `/tables/slots`      | Khung giờ trống        | ❌             |
| GET    | `/me`                | Đặt chỗ của tôi        | ✅ Customer    |
| PUT    | `/update/:id`        | Cập nhật đặt chỗ       | ✅             |
| PUT    | `/update-status/:id` | Cập nhật trạng thái    | 👥 Staff/Admin |
| PUT    | `/cancel/:id`        | Hủy đặt chỗ            | ✅             |

### 🍜 Menu — `/api/menu`

| Method | Endpoint                           | Mô tả                   | Auth       |
| ------ | ---------------------------------- | ----------------------- | ---------- |
| POST   | `/category`                        | Tạo danh mục            | 🔧 Manager |
| PUT    | `/category/:id`                    | Cập nhật danh mục       | 🔧 Manager |
| GET    | `/category/:restaurantId`          | Danh mục theo nhà hàng  | ❌         |
| POST   | `/item`                            | Tạo món ăn              | 🔧 Manager |
| PUT    | `/item/:id`                        | Cập nhật món ăn         | 🔧 Manager |
| PUT    | `/item/:id/availability`           | Bật/tắt món             | 🔧 Manager |
| GET    | `/item/category/:catId`            | Món theo danh mục       | ❌         |
| GET    | `/items/:restaurantId`             | Tất cả món của nhà hàng | ❌         |
| GET    | `/item/available/:restaurantId`    | Món đang bán            | ❌         |
| GET    | `/items/bestsellers/:restaurantId` | Món bán chạy            | ❌         |

### 📦 Orders — `/api/orders`

| Method | Endpoint                  | Mô tả                     | Auth             |
| ------ | ------------------------- | ------------------------- | ---------------- |
| POST   | `/`                       | Tạo order                 | ✅               |
| POST   | `/add-item`               | Thêm món vào order        | ✅               |
| POST   | `/item/:itemId/:status`   | Cập nhật trạng thái item  | ✅               |
| GET    | `/:id`                    | Chi tiết order            | ✅               |
| GET    | `/restaurant/:id`         | Đơn theo nhà hàng         | 👥 Staff         |
| GET    | `/restaurant/:id/:status` | Đơn theo trạng thái       | 👥 Staff         |
| GET    | `/active/:restaurantId`   | Đơn đang active           | 👥 Staff         |
| GET    | `/table/:tableId`         | Đơn theo bàn              | ✅               |
| GET    | `/my-orders`              | Đơn của tôi               | ✅               |
| PUT    | `/:id`                    | Cập nhật order            | 👥 Staff/Manager |
| PUT    | `/:id/status`             | Cập nhật trạng thái order | 👥 Staff/Manager |

### 💳 Payments — `/api/payments`

| Method | Endpoint                     | Mô tả                  | Auth     |
| ------ | ---------------------------- | ---------------------- | -------- |
| GET    | `/:paymentId`                | Chi tiết thanh toán    | ✅       |
| POST   | `/initiate`                  | Khởi tạo thanh toán    | ✅       |
| POST   | `/:paymentId/method/:method` | Chọn phương thức TT    | ✅       |
| PATCH  | `/status`                    | Cập nhật trạng thái TT | 👥 Staff |
| POST   | `/ewallet/:orderId`          | Tạo URL ví điện tử     | ✅       |
| POST   | `/return/vnpay`              | Return URL từ VNPAY    | ❌       |
| POST   | `/webhook`                   | Webhook thanh toán     | ❌       |
| POST   | `/banking/:orderId`          | Tạo PayOS URL          | ✅       |

### 🖼️ Upload — `/api/upload`

| Method | Endpoint    | Mô tả                              | Auth |
| ------ | ----------- | ---------------------------------- | ---- |
| POST   | `/`         | Upload 1 ảnh (field: `image`)      | ✅   |
| POST   | `/multiple` | Upload nhiều ảnh (field: `images`) | ✅   |
| DELETE | `/`         | Xóa ảnh theo URL                   | ✅   |

### 🔔 Notifications — `/api/notifications`

| Method | Endpoint                  | Mô tả                  | Auth |
| ------ | ------------------------- | ---------------------- | ---- |
| GET    | `/:restaurantId`          | Danh sách thông báo    | ✅   |
| PATCH  | `/:id/read`               | Đánh dấu đã đọc        | ✅   |
| POST   | `/read-all/:restaurantId` | Đánh dấu tất cả đã đọc | ✅   |

### 📊 Analytics — `/api/analytics`

| Method | Endpoint            | Mô tả                  | Auth             |
| ------ | ------------------- | ---------------------- | ---------------- |
| GET    | `/overview`         | Tổng quan              | 🔧 Manager/Admin |
| GET    | `/revenue-hourly`   | Doanh thu theo giờ     | 🔧 Manager/Admin |
| GET    | `/order-channels`   | Thống kê kênh đặt hàng | 🔧 Manager/Admin |
| GET    | `/revenue-channels` | Doanh thu theo kênh    | 🔧 Manager/Admin |

### ⚙️ Settings — `/api/settings`

| Method | Endpoint                                 | Mô tả                | Auth     |
| ------ | ---------------------------------------- | -------------------- | -------- |
| POST   | `/create`                                | Tạo cài đặt          | 👑 Admin |
| GET    | `/get-or-create/:scope/:model/:targetId` | Lấy hoặc tạo cài đặt | ✅       |
| GET    | `/:id`                                   | Chi tiết cài đặt     | ✅       |
| PUT    | `/:id`                                   | Cập nhật cài đặt     | ✅       |
| PATCH  | `/:id/payment-method`                    | Cập nhật PTTT        | ✅       |
| DELETE | `/:id`                                   | Xóa cài đặt          | 👑 Admin |

**Ký hiệu:**

- ❌ = Public (không cần token)
- ✅ = Yêu cầu đăng nhập (bất kỳ role)
- 👥 = Staff / Manager / Admin
- 🔧 = Manager / Admin
- 👑 = Admin only

---

## 🔄 Luồng nghiệp vụ

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
  │                               │ verifyToken middleware
  │                               │ Decode JWT → req.user
  │                               │
  │ (Token hết hạn)               │
  ├── POST /api/auth/refresh ───→ │ Verify refreshToken
  │ ←── { newAccessToken }        │
```

### 2. Đặt chỗ (Customer)

```
1. GET  /api/reservations/tables/slots?restaurantId=...&date=...
   → Xem khung giờ còn trống

2. POST /api/reservations/create
   Body: { restaurantId, tableId, date, time, guestCount, note }
   → Tạo reservation, nhận reservationId

3. Nhân viên nhận thông báo realtime qua Socket.IO
   → Xác nhận / hủy qua PUT /api/reservations/update-status/:id
```

### 3. Order & Phục vụ (Staff)

```
1. POST /api/orders
   Body: { tableId, restaurantId }
   → Tạo order mới cho bàn

2. POST /api/orders/add-item
   Body: { orderId, menuItemId, quantity, note }
   → Thêm món vào order

3. POST /api/orders/item/:itemId/preparing
   → Cập nhật trạng thái: pending → preparing

4. POST /api/orders/item/:itemId/served
   → Cập nhật trạng thái: preparing → served
   → Realtime notify cho khách

5. PUT /api/orders/:id/status (completed)
   → Hoàn thành order
```

### 4. Thanh toán

```
Tiền mặt:
1. POST /api/payments/initiate { orderId }
2. PATCH /api/payments/status { paymentId, status: "paid" }

Chuyển khoản (PayOS):
1. POST /api/payments/banking/:orderId
   → Nhận { checkoutUrl }
2. Redirect khách đến checkoutUrl
3. PayOS gọi webhook → POST /api/payments/webhook
   → Server tự động cập nhật trạng thái

VNPAY:
1. POST /api/payments/ewallet/:orderId
   → Nhận { paymentUrl }
2. Redirect khách đến paymentUrl
3. VNPAY redirect về → POST /api/payments/return/vnpay
   → Server xử lý và cập nhật trạng thái
```

---

## 🔌 Realtime với Socket.IO

Server khởi tạo Socket.IO trong `server/src/index.ts`:

```typescript
import { initSocket } from './socket';
const server = http.createServer(app);
initSocket(server);
```

### Events chính

| Event              | Hướng           | Mô tả                     |
| ------------------ | --------------- | ------------------------- |
| `connection`       | Client → Server | Khách kết nối             |
| `join:restaurant`  | Client → Server | Tham gia room nhà hàng    |
| `order:update`     | Server → Client | Cập nhật trạng thái order |
| `notification:new` | Server → Client | Thông báo mới             |
| `reservation:new`  | Server → Client | Có đặt chỗ mới            |
| `table:status`     | Server → Client | Trạng thái bàn thay đổi   |

### Client kết nối

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000');

socket.on('connect', () => {
  socket.emit('join:restaurant', restaurantId);
});

socket.on('order:update', (data) => {
  // Xử lý cập nhật đơn hàng
});

socket.on('notification:new', (notification) => {
  // Hiển thị thông báo
});
```

---

## 💰 Tích hợp thanh toán

### PayOS (Chuyển khoản ngân hàng)

```typescript
// Tạo link thanh toán
POST /api/payments/banking/:orderId

// Response
{
  "checkoutUrl": "https://pay.payos.vn/web/...",
  "orderCode": 123456
}

// Webhook callback (tự động)
POST /api/payments/webhook
```

### VNPAY

```typescript
// Tạo URL thanh toán
POST /api/payments/ewallet/:orderId

// Response
{
  "paymentUrl": "https://sandbox.vnpayment.vn/..."
}

// Return URL (sau khi thanh toán)
POST /api/payments/return/vnpay
```

---

## 🔒 Bảo mật

### Authentication

- JWT với access token ngắn hạn (15 phút) + refresh token dài hạn (7 ngày)
- Refresh token được lưu HTTP-only cookie để tránh XSS
- Middleware `verifyToken` kiểm tra signature và expiry

### Authorization

- Middleware `verifyRole(...roles)` kiểm tra quyền truy cập
- Các route admin/manager được bảo vệ nghiêm ngặt
- Người dùng chỉ truy cập được data của chính họ

### Bảo vệ thông tin nhạy cảm

- Không commit `.env` lên VCS (đã thêm vào `.gitignore`)
- Các secret key chỉ lưu trong biến môi trường
- Webhook thanh toán xác thực signature trước khi xử lý

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
.vscode/
```

---

## 🚢 Triển khai (Deployment)

### Frontend — Vercel

```bash
# Cài đặt Vercel CLI
npm i -g vercel

cd client
vercel --prod
```

Hoặc kết nối GitHub repo với Vercel Dashboard để auto-deploy khi push.

> Build command: `npm run build`
> Output directory: `dist`

### Backend — Render / Railway / VPS

```bash
# Build TypeScript
cd server
npm run build

# Chạy production
node dist/index.js
```

**Biến môi trường cần set trên server production:**

- Tất cả các biến trong `server/.env`
- `NODE_ENV=production`
- `PORT` (thường do platform cung cấp)

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:

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

## 👨‍💻 Tác giả

**datnd.02** — [@daidat02](https://github.com/daidat02)

