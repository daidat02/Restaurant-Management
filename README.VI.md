# Restaurant Management

Ứng dụng quản lý nhà hàng (backend Node.js + Express + TypeScript, frontend React + Vite). Hỗ trợ quản lý nhà hàng, bàn, đặt chỗ, menu, order, thanh toán, upload ảnh, thông báo và báo cáo phân tích. Sử dụng MongoDB, Socket.IO, Cloudinary và PayOS/VNPAY.

---

## Kiến trúc tổng quan

- Server: Node.js, Express, TypeScript (thư mục `server/src`) — API REST và Socket.IO.
- Client: React + Vite (thư mục `client`).
- Database: MongoDB (dùng biến MONGODB_URL).
- Upload ảnh: Cloudinary.
- Thanh toán: PayOS / VNPAY (webhooks xử lý trả về).

## Cài đặt & chạy (môi trường phát triển)

Yêu cầu: Node.js >= 18, npm hoặc yarn, MongoDB (URI), tài khoản Cloudinary, cấu hình PayOS/VNPAY.

1. Clone repo:
   cd restaurant_management

2. Server:
   cd server
   npm install
   - Tạo file `.env` (tham khảo các biến ở phần "Biến môi trường")
     npm run start
     (script `start` chạy `tsc --watch` + `nodemon dist/index.js`)

3. Client:
   cd ../client
   npm install
   npm run dev
   - Mặc định client proxy tới `http://localhost:8000` (xem `client/package.json`)

## Biến môi trường (KHÔNG commit giá trị thật vào VCS)

Tạo file `server/.env` với các khóa sau (ví dụ chỉ là tên biến):

- MONGODB_URL
- PORT
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- JWT_EXPIRES_IN
- JWT_COOKIE_EXPIRES_IN
- CLOUDINARY_URL, CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- VNP_HASHSECRET_KEY, VNP_TMNCODE, VNP_URL, VNP_RETURN_URL
- Các biến PayOS nếu cần (theo tài liệu PayOS)

## Điểm vào (API) chính

Tất cả endpoint tiền tố `/api` (server cấu hình `app.use('/api', router)`). Dưới đây tóm tắt route theo module:

- /api/auth
  - POST /register — đăng ký người dùng
  - POST /login — đăng nhập (trả access/refresh token)
  - POST /refresh — làm mới token
  - GET /profile/me — lấy profile người dùng (cần token)
  - PATCH /update/me — cập nhật thông tin người dùng
  - Các route admin: GET /, GET /profile/:id, PUT /admin/update/:id, DELETE /admin/delete/:id

- /api/restaurants
  - POST / — tạo (admin)
  - GET / — lấy danh sách
  - GET /:id — chi tiết
  - PUT /update/:id, DELETE /:id (admin)

- /api/tables
  - POST /create (manager|admin)
  - GET /:id, PUT /:id, DELETE /:id
  - GET /restaurant/:restaurantId — lấy bàn theo nhà hàng
  - PATCH /:id/status — cập nhật trạng thái (admin|staff|manager)

- /api/reservations
  - POST /create — tạo đặt chỗ (khách)
  - POST /create-by-staff — nhân viên tạo đặt chỗ
  - GET /restaurants — lấy nhà hàng còn bàn trống
  - GET /tables/slots — lấy khung giờ trống
  - GET /me — đặt chỗ của user (customer)
  - PUT /update/:id — cập nhật
  - PUT /update-status/:id — cập nhật trạng thái (staff/admin)
  - PUT /cancel/:id — hủy

- /api/menu
  - Category: POST /category, PUT /category/:id, GET /category/:restaurantId
  - Item: POST /item, PUT /item/:id, PUT /item/:id/availability
  - GET /item/category/:catId, /items/:restaurantId, /item/available/:restaurantId, /items/bestsellers/:restaurantId

- /api/orders
  - POST / — tạo order
  - POST /add-item — thêm món vào order
  - POST /item/:itemId/:status — cập nhật trạng thái item (cần token)
  - GET /:id — chi tiết order
  - GET /restaurant/:id[/:status] — lấy đơn theo nhà hàng
  - GET /active/:restaurantId — đơn đang active
  - GET /table/:tableId, /my-orders
  - PUT /:id, PUT /:id/status — cập nhật đơn (staff|manager)

- /api/upload
  - POST / — upload single (`image`)
  - POST /multiple — upload multiple (`images`)
  - DELETE / — xóa ảnh

- /api/payments
  - GET /:paymentId — lấy chi tiết thanh toán
  - POST /initiate — khởi tạo thanh toán
  - POST /:paymentId/method/:method — cập nhật phương thức thanh toán
  - PATCH /status — thay đổi trạng thái
  - POST /ewallet/:orderId — tạo URL thanh toán e-wallet
  - POST /return/vnpay — return URL VNPAY
  - POST /webhook — webhook thanh toán
  - POST /banking/:orderId — tạo PayOS URL

- /api/notifications
  - GET /:restaurantId — lấy notification (cần login)
  - PATCH /:id/read — đánh dấu đã đọc
  - POST /read-all/:restaurantId — đánh dấu tất cả

- /api/analytics
  - GET /overview, /revenue-hourly, /order-channels, /revenue-channels (cần role manager/admin)

- /api/settings
  - POST /create (admin), GET /get-or-create/:scope/:model/:targetId, GET /:id, PUT /:id, PATCH /:id/payment-method, DELETE /:id

## Luồng sử dụng chính (ví dụ)

1. Authentication
   - Khách POST /api/auth/register -> POST /api/auth/login -> nhận access token
   - Gọi API bảo vệ bằng header `Authorization: Bearer <accessToken>`
   - Khi token hết hạn, POST /api/auth/refresh để lấy token mới

2. Đặt chỗ (Customer)
   - GET /api/reservations/tables/slots để xem khung giờ
   - POST /api/reservations/create với thông tin khách, nhà hàng, thời gian, số người
   - Nhân viên/admin xem và cập nhật trạng thái qua /api/reservations/:id

3. Order và phục vụ (Staff)
   - Tạo order POST /api/orders (bàn/tableId hoặc theo đặt chỗ)
   - Thêm món POST /api/orders/add-item
   - Cập nhật trạng thái item POST /api/orders/item/:itemId/:status (ví dụ prepare, served)
   - Xem đơn active /api/orders/active/:restaurantId

4. Thanh toán
   - Khởi tạo thanh toán POST /api/payments/initiate (server trả về URL hoặc thông tin)
   - Xử lý return/webhook tại /api/payments/webhook và /api/payments/return/vnpay

5. Upload ảnh
   - POST /api/upload (single) hoặc /multiple -> lưu lên Cloudinary

## Realtime (Socket.IO)

Server khởi tạo Socket.IO (`initSocket(server)` trong `server/src/index.ts`) để gửi notification/real-time order updates. Client cần kết nối tới server socket và lắng nghe event phù hợp (ví dụ `order:update`, `notification:new`).

## Ghi chú bảo mật

- Tuyệt đối không commit file `.env` có chứa khóa API/secret vào VCS.
- Thay thế các secret trong `.env` bằng biến môi trường trong môi trường production.
- Kiểm tra kỹ các route admin/manager có middleware `verifyRole` để bảo vệ quyền truy cập.

## Liên hệ

Tác giả: datnd.02

---

Nếu muốn, có thể tạo thêm phần API examples (ví dụ cURL hoặc Postman collection).
