# Hệ Thống Quản Lý Nhà Hàng Chuỗi (Backend Core)

Hệ thống Backend chuyên biệt dạng SaaS (Multi-tenant), hiệu năng cao và bảo mật nghiêm ngặt được thiết kế cho việc vận hành chuỗi nhà hàng doanh nghiệp. Kiến trúc lõi xử lý toàn diện từ luồng gọi món thời gian thực (Real-time), thuật toán chống trùng lịch đặt bàn, tự động hóa xử lý giao dịch qua các cổng thanh toán trung gian, cho đến hệ thống phân tích dữ liệu quản trị kinh doanh nâng cao.

## 🌟 Các Điểm Sáng Kiến Trúc Cốt Lõi

- **Kiến trúc Phân tầng Sạch (Layered Architecture):** Tách biệt triệt để trách nhiệm xử lý giữa các tầng `Routes ➔ Controllers ➔ Services ➔ Repositories` để tăng tính mô-đun, dễ bảo trì và tối ưu hóa cho viết Unit Test[cite: 1, 2, 3, 4, 10, 15, 17, 24, 37, 41, 45].
- **Cô lập Dữ liệu Đa chi nhánh (Multi-Tenant Isolation):** Cơ chế quản trị dữ liệu độc lập dữ liệu tuyệt đối giữa các chi nhánh nhà hàng (Thực đơn, Đơn hàng, Bàn ăn, Cấu hình) thông qua phạm vi ràng buộc của từng ID chi nhánh cụ thể[cite: 10, 15, 17, 43, 45, 47].
- **Đảm bảo Tính Toàn vẹn Dữ liệu (ACID Transactions):** Triển khai cơ chế **Mongoose Multi-Document Transactions** cho các luồng nghiệp vụ quan trọng (như khởi tạo đồng thời đơn hàng và khóa bàn ăn), đảm bảo dữ liệu không bị sai lệch hoặc rác khi xảy ra lỗi hệ thống[cite: 17, 26].
- **Luồng Sự kiện Thời gian thực (Real-time Event Stream):** Ứng dụng kiến trúc **Socket.IO Multi-Room** cô lập (`restaurant_${id}`, `payment_${id}`) để phát phát tức thì các thông báo, luồng cập nhật đơn hàng và webhook bất đồng bộ mà không cần Frontend chạy cơ chế Polling liên tục gây tốn tài nguyên mạng[cite: 13, 14, 17, 23, 27, 39, 43].
- **Truy vấn Thống kê Phân tích Chuyên sâu (MongoDB Aggregations):** Xây dựng các mô hình báo cáo theo chuỗi thời gian được tính toán trực tiếp từ Database thông qua các đường ống kết hợp (`$group`, `$cond`, `$hour` ép múi giờ GMT+7) giúp hệ thống tính toán báo cáo dữ liệu lớn với hiệu năng cao[cite: 10, 15].
- **Bảo mật Mã hóa Đa tầng:** Thiết lập khung bảo mật mạnh mẽ tích hợp cơ chế **Xoay vòng Token liên tục (Refresh Token Rotation)** qua HttpOnly Cookies bảo mật, phân quyền người dùng nghiêm ngặt (RBAC), ẩn giấu dữ liệu nhạy cảm ở Schema DB (`.select('+field')`) và mã hóa khóa bí mật (`encryptKey`)[cite: 1, 3, 4, 45, 47].
- **Xử lý Bất đồng bộ Song song:** Tối ưu hóa thời gian phản hồi của API lên đến **50%** đối với các tác vụ nén tải tệp tin hàng loạt hoặc nạp song song dữ liệu báo cáo so sánh bằng cách tận dụng mô hình thực thi `Promise.all`[cite: 32, 35].

---

## 🛠️ Công Nghệ Sử Dụng & Thư Viện Lõi

- **Runtime & Ngôn ngữ:** Node.js (v18+), TypeScript, Express.js[cite: 3, 7, 11, 16, 20, 25, 31, 34, 38, 42, 46]
- **Cơ sở dữ liệu & ODM:** MongoDB, Mongoose (ACID Transactions, Aggregations)[cite: 2, 6, 10, 15, 17, 19, 24, 26, 35, 37, 41, 43, 45]
- **Giao tiếp Thời gian thực:** Socket.IO (Event-Driven Multi-Rooms)[cite: 13, 14, 23, 39]
- **Bảo mật & Xác thực:** JSON Web Tokens (JWT), Bcrypt, Cookie-Parser[cite: 1, 2, 4, 26]
- **Tích hợp Cổng Thanh toán:** `@payos/node` (PayOS API), VNPAY SDK (Mã hóa bảo mật chữ ký số SHA-512/HMAC)[cite: 27, 28]
- **Xử lý Tệp tin Truyền thông:** Multer, Cloudinary SDK (Upload song song theo chuỗi Promise)[cite: 30, 31, 32]
- **Tiện ích đi kèm:** Moment.js, Quick-String (qs)[cite: 28]

---

## 📂 Tổng Quan Các Module Nghiệp Vụ

### 1. Quản Lý Xác Thực & Phân Quyền Đa Chi Nhánh (`/auth`)

- Triển khai luồng Đăng ký/Đăng nhập bảo mật sử dụng mã hóa băm mật khẩu Bcrypt và vòng đời cấp phát Token an toàn[cite: 1, 2, 4].
- Thiết lập ranh giới bảo mật nghiêm ngặt thông qua middleware phân quyền Role-Based Access Control (RBAC) (`verifyRole(['admin', 'manager', 'staff'])`)[cite: 3, 4].
- Xử lý thuật toán xóa mềm người dùng (`isActive: false`) nhằm bảo toàn tính toàn vẹn cho lịch sử giao dịch và hóa đơn cũ trong DB[cite: 2, 4].

### 2. Quản Lý Chi Nhánh & Tài Sản Bàn Ăn (`/restaurants` & `/tables`)

- Xử lý thông tin hồ sơ cấu hình chi tiết cho từng pháp nhân chi nhánh nhà hàng riêng biệt trong chuỗi[cite: 6, 7, 8].
- Quản trị trạng thái tài sản bàn ăn theo thời gian thực (`available`, `occupied`, `reserved`)[cite: 17, 19, 21].
- Tích hợp middleware kiểm tra logic chặn nhân viên xóa hoặc thay đổi trạng thái bàn ăn nếu bàn đó đang gắn liền với một hóa đơn chưa thanh toán[cite: 21].

### 3. Quản Lý Thực Đơn & Danh Mục Món Ăn (`/menu`)

- Xây dựng công cụ phân loại danh mục hiệu năng cao ứng dụng các đường ống kết hợp MongoDB Aggregation Lookup[cite: 10].
- Tính toán và điền sẵn số lượng món ăn khả dụng của từng danh mục trực tiếp từ database để triệt tiêu lỗi suy giảm hiệu năng hệ thống do vòng lặp truy vấn thô ($N+1$ query)[cite: 10, 12].
- Tận dụng chỉ mục cơ sở dữ liệu (Database Indexing) trên trường đếm số lượng gọi món (`orderCount`) để truy xuất danh sách món ăn bán chạy nhất ngay lập tức[cite: 10, 12].

### 4. Chuỗi Xử Lý Đơn Hàng Thời Gian Thực (`/orders`)

- Thực thi luồng xử lý đơn hàng phức tạp (Gọi món tại bàn, Giao hàng, Mang về) kết hợp theo dõi đa tài liệu bằng Mongoose[cite: 15, 17].
- Áp dụng **Mô hình Chụp dữ liệu (Data Snapshot Pattern)** để lưu giữ cố định tên và giá món ăn tại thời điểm khách đặt đặt (`priceSnapshot`, `nameSnapshot`), bảo vệ hóa đơn cũ không bị biến động sai lệch khi nhà hàng thay đổi giá thực đơn trên hệ thống[cite: 17].
- Phát phát sự kiện realtime định hướng micro-scoped qua các phòng Socket.IO chuyên biệt ngay khi đơn hàng có sự thay đổi trạng thái (`CREATE`, `ADD_ITEMS`, `UPDATE_STATUS`)[cite: 13, 17].

### 5. Thuật Toán Tối Ưu Lịch Đặt Bàn Trước (`/reservations`)

- Xây dựng **Thuật toán Kiểm tra Trùng lịch Bàn ăn (Time-Window Collision Avoidance)** vận hành trên phép toán quy đổi mốc phút tuyệt đối, tự động loại trừ các bàn bị cấn lịch trong biên độ $\pm120$ phút (2 tiếng) của ngày đặt mục tiêu[cite: 43].
- Thiết lập ma trận trạng thái khung giờ trống (Time-Slot Matrix) thông qua hàm gộp mảng phục vụ cho giao diện sơ đồ bàn trực quan ở Frontend[cite: 43].
- Thiết lập mốc thời gian kiểm tra an toàn (`safe_check_time`) để tự động cảnh báo hoặc hủy lệnh đặt bàn nếu khách đến muộn quá thời gian quy định[cite: 43].

### 6. Quản Lý Dòng Tiền & Tích Hợp Cổng Thanh Toán (`/payments`)

- Tích hợp song song các trình xử lý tài chính phức tạp bao gồm **VNPAY (Xác thực Checksum SHA-512)** và **PayOS (Xác thực chữ ký số Webhook tự động theo nhà hàng)**[cite: 26, 27, 28].
- Phòng chống triệt để lỗi trùng lặp giao dịch hoặc xung đột dòng tiền do mạng bằng cơ chế khóa trạng thái nguyên tử (`initiated` state check)[cite: 24, 26, 27].
- Điều phối chuỗi hành động đồng bộ (Cascading Mutation) khi nhận kết quả giao dịch thành công: ghi nhận trạng thái thanh toán hệ thống, cập nhật hóa đơn là `paid`, tự động giải phóng bàn ăn về trạng thái trống `available`[cite: 26].

### 7. Quản Trị Cấu Hình Hệ Thống Động SaaS (`/settings`)

- Tận dụng tối đa tính nguyên tử của cơ chế **Mongoose Upsert (`findOneAndUpdate` phối hợp `$setOnInsert`)** để tự động khởi tạo tập hợp các tham số vận hành mặc định khi tài khoản chi nhánh mới được kích hoạt[cite: 45].
- Tự động hóa phân nhánh cổng thanh toán: tự sinh chuỗi URL ảnh QR tĩnh theo chuẩn VietQR đối với hình thức chuyển khoản thường, hoặc nạp động tập hợp các API Key của bên thứ ba[cite: 47].
- Đảm bảo tính an toàn tuyệt đối cho tài sản số của đối tác bằng cách bóc tách hoàn toàn và xóa bỏ cấu hình Key thật (`Data Masking`) trước khi REST API truyền dữ liệu qua mạng internet[cite: 47].

### 8. Bộ Công Cụ Thống Kê & Phân Tích Quản Trị (`/analytics`)

- Vận hành bộ tính toán dữ liệu chu kỳ báo cáo giúp tự động đo lường phần trăm tăng trưởng doanh thu, số lượng đơn, giá trị trung bình bill so với kỳ trước đó[cite: 35].
- Thuật toán **Chuẩn hóa Dữ liệu Biểu đồ (Data Normalization)** giúp tự động bù đắp các khoảng trống thời gian (điền trạng thái doanh thu bằng 0 cho các khung giờ nhà hàng đóng cửa hoặc không có khách), giữ cho biểu đồ ở Frontend luôn hiển thị liên tục[cite: 35].
- Phân loại luồng dòng tiền thông minh, tách bạch tỉ trọng doanh thu giữa Khách quét mã QR tại bàn, Nhân viên lên đơn, Giao hàng tận nơi, và Mua mang về[cite: 35].

---

## 🎛️ Hướng Dẫn Cài Đặt Môi Trường Phát Triển Local

### Yêu Cầu Hệ Thống

- Node.js >= 18.x
- Cơ sở dữ liệu MongoDB (Local hoặc Chuỗi URI kết nối của MongoDB Atlas Cluster)
- Tài khoản Cloudinary & Các chuỗi khóa API
- Tài khoản Nhà phát triển (Sandbox Merchant) của PayOS và VNPAY

### Các Bước Cài Đặt

1. **Tải Mã Nguồn Về Máy:**

```bash
   git clone [https://github.com/your-username/restaurant_management.git](https://github.com/your-username/restaurant_management.git)
   cd restaurant_management/server
```
