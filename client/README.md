# Client — Frontend Restaurant Management System

Frontend của hệ thống quản lý nhà hàng multi-tenant, xây dựng bằng **React 19 + Vite + TypeScript**.

## Công nghệ

| Công nghệ | Mục đích |
| --- | --- |
| React 19 + Vite | UI framework, build tool |
| TypeScript | Type safety |
| Redux Toolkit + redux-persist | State management (slices: auth, cart, restaurant, upsell) |
| React Router 7 | Routing & bảo vệ route theo role |
| Tailwind CSS + shadcn/ui (Radix UI) | Styling & UI components |
| Socket.IO Client | Realtime: order, chat, notification, presence |
| Axios | HTTP client |
| Recharts | Biểu đồ báo cáo |
| qrcode.react | QR bàn / thanh toán |
| Sonner | Toast notification |

## Cấu trúc

```
src/
├── App.tsx                 # Routing theo role (public/customer/admin/manager/staff/super-admin/kds)
├── api/                    # 17 API modules (auth, order, message, payment...)
├── pages/
│   ├── Landing/            # Landing page + AuthModal (login/register owner) + Pricing/Guide/FAQ/Contact
│   ├── Auth/               # Onboarding, KDS
│   ├── Customer/           # Menu, Product detail, Cart, Payment, Reservation, Account
│   ├── Admin/              # Dashboard, Restaurants, Billing, Users, Products, Orders, Reports, Logs
│   ├── Manager/            # Menu items, POS, Orders, Tables, Reservations, Staff, Analytics
│   └── SuperAdmin/         # Tenants, Pricing, Transactions, Audit
├── layouts/                # LayoutAdmin, LayoutBlank, LayoutCustomer, LayoutSuperAdmin
├── components/             # Header (MailBoxPopover), Sidebar, UI (shadcn)...
├── hooks/                  # use-auth, use-socket, use-messaging, use-order...
├── redux/                  # store + slices
├── configs/                # socket.io client config
├── constants/              # BASE_URL, server URL...
├── types/                  # TypeScript interfaces
└── utils/ + lib/           # Helper functions
```

## Cài đặt & chạy

```bash
npm install
cp .env.example .env
npm run dev          # chạy tại http://localhost:5173
```

## Biến môi trường — `client/.env`

```env
VITE_BASE_URL=http://localhost:5173
VITE_SERVER_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=
```

## Scripts

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Development server (Vite HMR) |
| `npm run build` | Build production (`tsc -b && vite build`) |
| `npm run typecheck` | Kiểm tra type TypeScript |
| `npm run lint` | ESLint (baseline) |

## Realtime (Socket.IO)

Client kết nối socket qua `src/configs/socket.io.ts` (instance `socket` + `connectSocketWithAuth(token)`). Các module realtime chính:

- **Order:** `order_event`, `new_notification` — cập nhật đơn hàng theo tenant.
- **Chat:** `send_message` / `new_message`, `typing`, `conversation_updated`, `user_online` / `user_offline` (presence). `useMessaging` (MessagingProvider trong `LayoutAdmin`/`LayoutSuperAdmin`) quản lý hộp thư `MailBoxPopover` trên Header.
- **Payment:** `payment_success`.

Phòng socket: `restaurant_<id>` (tenant), `conversation_<id>` (chat), `user_<id>` (cá nhân), `payment_<id>` (thanh toán). Server chỉ nhận `init_room_restaurant` khi user thuộc đúng tenant.
