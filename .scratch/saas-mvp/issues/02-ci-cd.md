# 02 — CI/CD GitHub Actions: typecheck + test + build trên mỗi PR

**What to build:** Pipeline CI tự động để mỗi PR/push vào `feature/*` / `main` đều chạy typecheck + toàn bộ test + build. Phát hiện hồi quy sớm, giữ codebase luôn xanh.

**Blocked by:** 01 — Hạ tầng test (cần `npm test` hoạt động).

**Status:** ready-for-agent

Chi tiết kỹ thuật:
- `.github/workflows/ci.yml`:
  - Trigger: `push` + `pull_request` (branches `main`, `feature/*`).
  - Job **server**:
    - `cd server && npm ci`
    - `npx tsc --noEmit` (typecheck)
    - `npm test` (vitest run, MongoDB Memory Server tự tải binary — cache cho lần chạy sau)
    - `npm run build`
  - Job **client**:
    - `cd client && npm ci`
    - `npx tsc --noEmit`
    - `npm run lint` (chấp nhận baseline lỗi hiện có nếu có — quyết định khi chạy)
    - `npm run build`
  - Job **e2e** (optional, chạy song song hoặc `workflow_dispatch`):
    - Cài Playwright browsers: `npx playwright install --with-deps chromium`
    - Chạy `npx playwright test`
    - Upload artifact test-results khi fail.
  - Cache: `npm` (dependencies), Playwright browsers, Mongo Memory Server binary.
- **Không đụng DB thật**: test dùng Memory Server; không có bước nào chạm MongoDB Atlas.
- Branch protection không bắt buộc trong đợt này (ghi chú nếu cần).

- [ ] PR push → CI chạy đủ 2 job server + client, tất cả pass.
- [ ] E2E job chạy được (hoặc đã cân nhắc tắt để giảm thời gian).
- [ ] Build ra `dist/` không lỗi trên CI.

**Lưu ý:** nếu ESLint client đang có baseline lỗi, dùng `eslint` với rule chặn fail hoặc giới hạn file đã sạch — không làm tắc CI ngay từ đầu.
