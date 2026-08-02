# Mission chuyển từ React component API sang CI/CD

Mission của workspace đã chuyển từ "Thiết kế API component React" sang "Vận hành CI/CD cho restaurant_management" (xem [[MISSION.md]]). Nguyên nhân: giai đoạn SaaS MVP đang cần pipeline tự động để giữ codebase xanh trước khi deploy lên Render/Vercel; hạ tầng test vừa được xây ở ticket 01–02.

**Evidence:** user chủ động `/teach` và yêu cầu "mô tả rõ cách vận hành" sau khi hoàn thành ticket 02 (CI/CD), xác nhận cập nhật mission qua câu hỏi.

**Implications:** các phiên sau nên xoay quanh đọc hiểu + mở rộng `.github/workflows/ci.yml` và xử lý job đỏ. Chủ đề React component API tạm gác — khi user quay lại thì phục hồi từ learning-records cũ (chưa có).

# Các insight kỹ thuật CI/CD đã thiết lập (ticket 01–02)

Pipeline gồm 3 job: `server` (typecheck + vitest + build), `client` (tsc -b + lint baseline + build), `e2e` (Playwright với server test dùng Memory Server qua `E2E_SERVER=test`). Một số điểm phi-trực-quan phát hiện khi dựng CI:
- Client root tsconfig là **solution-style** (`files: [], references`) → `tsc --noEmit` không kiểm tra gì; phải dùng `tsc -b`.
- MongoDB Memory Server tải binary mongod (~100MB) mỗi lần chạy nếu không cache `~/.cache/mongodb-binaries`.
- E2E không thể dùng DB thật → tạo entry `server/src/test/server.ts` (Memory Server + seed + listen) để Playwright webServer khởi động.
- ESLint client baseline 405 errors → tạm `|| true` thay vì chặn fail.

# Cách vận hành CI/CD (user đã được giải thích — ghi nhớ để dùng lại)

## Kiến trúc
- File điều khiển duy nhất: `.github/workflows/ci.yml`. GitHub Actions tự đọc khi có push/PR lên GitHub.
- Trigger: `push` + `pull_request` trên `main` và `feature/*`. **Không cần gọi gì thủ công.**

## 3 job (mỗi job = 1 máy ubuntu-latest cài Node 22, chạy song song, độc lập)
| Job | Các bước tuần tự | Trả lời câu hỏi |
|-----|------------------|-----------------|
| server | `tsc --noEmit` → `npm test` (Vitest + Memory Server) → `npm run build` | Backend type-sai? Test pass? Build ra dist/? |
| client | `tsc -b` → `npm run lint` (không chặn fail) → `npm run build` | Frontend typecheck/build? Lint lỗi mới? |
| e2e | build server → `npx playwright test` (env `E2E_SERVER=test`) | Luồng UI→API thật có ổn? |

Bước nào fail → job đỏ (✗); không fail → xanh (✓).

## Cache (3 thứ đắt tiền được lưu giữa các lần chạy, dùng key theo hash lockfile)
- npm cache → `npm ci` nhanh.
- mongodb binary (`~/.cache/mongodb-binaries`, ~100MB) → không tải lại mongod.
- Playwright browsers (`~/.cache/ms-playwright`) → không tải lại Chromium.
- Lockfile đổi → key đổi → cache cũ hết hạn, tải mới (lần sau lại nhanh).

## Xử lý khi job đỏ
1. Vào tab **Actions** → workflow `CI` → run mới nhất → click job đỏ → click bước đỏ → đọc log.
2. Thứ tự ưu tiên: typecheck → test (đọc tên test fail) → build → e2e (xem artifact `playwright-report`).
3. Rule: **bước nào đỏ dừng ở đó**, các bước sau chưa chạy.

## Chạy tương đương local (chưa push remote thì dùng cách này để mô phỏng)
```bash
# job server
cd server && npx tsc --noEmit && npm test && npm run build
# job client
cd client && npx tsc -b && npm run lint || true && npm run build
# job e2e (mặc định dùng server dev đang chạy; muốn Memory Server: dừng dev 8000 rồi E2E_SERVER=test npx playwright test)
cd server && npm run build && cd .. && npx playwright test
```

## Bẫy kỹ thuật đặc thù dự án
1. Client typecheck bắt buộc `tsc -b` (root tsconfig solution-style; `--noEmit` sẽ "pass" giả).
2. Lint client không chặn fail (`|| true`) — baseline 405 errors cũ.
3. E2E không đụng DB thật — dùng `server/src/test/server.ts` (Memory Server + seed), switch bằng `E2E_SERVER=test`.
4. `vitest.config.ts` nằm ngoài `rootDir` của server tsconfig → phải exclude khỏi `tsc` build (đã làm ticket 01).
