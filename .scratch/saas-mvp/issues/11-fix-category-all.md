# 11 — Fix: client gọi `getItemsByCategory('all')` gây CastError ở server

**What to build:** Sửa client không được gọi `GET /menu/item/category/:catId` với `catId='all'` (tab "Tất cả"), vì server cast `'all'` sang ObjectId thất bại → `CastError`, server bắt lỗi và trả 500 (UI hiện toast lỗi). Cần dùng endpoint lấy toàn bộ item theo restaurant khi tab "Tất cả".

**Found by:** E2E ticket 06 (log WebServer xuất hiện `CastError ... value "all" ... path "category"` mỗi lần chạy scan-to-order/POS). Không gây fail E2E vì server bắt lỗi trả 500 nhưng flow chính vẫn dùng dữ liệu đã có.

**Blocked by:** (none)

**Status:** ready-for-agent

### Nguồn lỗi (đã xác định)
- `client/src/hooks/use-menu.ts:106` — `fetchItemsByCat(catId)` gọi thẳng `getItemsByCategory(catId)`.
- `client/src/pages/Customer/cart.tsx:170-177` — khi có `tableId` và `activeTab==='all'` → rơi vào nhánh `fetchItemsByCat(activeTab)` với `'all'` (bug). Nhánh đúng (`fetchTopBestSellers` khi không có tableId) đã check.
- `client/src/pages/Customer/menu.tsx:20` — `handleTabChange(cat)` gọi `fetchItemsByCat(cat)` trực tiếp, không check `cat==='all'` (useEffect ở dòng 25-28 đã check đúng, nhưng handler thì không).
- Đã xử lý đúng (không đụng): `client/src/pages/Admin/ProductPage/product.tsx:75-78` (check `activeCategory==='all'` → `fetchAllItems`).
- Server: `server/src/modules/MenuModule/menu.controller.ts:84-93` — `getItemByMenucatService(catId='all')` → `find({category: ObjectId('all')})` → CastError; controller bắt lỗi trả `500 {"message":"Lỗi server khi lấy món ăn theo danh mục"}`.

### Sửa
- Client:
  - `cart.tsx`: nhánh `activeTab==='all'` có `tableId` → gọi `fetchAllItems()` (hoặc bỏ gọi, dùng items đã có) thay vì `fetchItemsByCat('all')`.
  - `menu.tsx`: trong `handleTabChange`, nếu `cat==='all'` → `fetchAllItems()`, ngược lại `fetchItemsByCat(cat)`.
  - Rà soát các chỗ gọi `fetchItemsByCat` khác (`product-detail.tsx:44` — truyền `category` thật, an toàn) để đảm bảo không còn chỗ truyền `'all'`.
- Server (defensive, tùy chọn): `getItemByMenucatService` nếu `catId` không phải ObjectId hợp lệ → trả 200 rỗng hoặc 400 có message rõ ràng, không log stack CastError.

### Test
- E2E: sau khi sửa, chạy `npx playwright test e2e/customer.spec.ts` + `e2e/admin-flows.spec.ts` — log WebServer không còn `CastError` `"all"`.
- API: `GET /menu/item/category/all` (nếu defensive server) trả danh sách rỗng/400 rõ ràng thay vì 500.

- [ ] `cart.tsx` + `menu.tsx` không gọi `getItemsByCategory('all')`.
- [ ] Không còn `CastError` cho `"all"` trong log WebServer khi chạy E2E.
- [ ] Tab "Tất cả" vẫn hiển thị đủ món (POS + scan-to-order + delivery).
