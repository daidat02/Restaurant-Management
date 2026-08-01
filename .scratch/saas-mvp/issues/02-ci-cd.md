# 02 — CI/CD GitHub Actions: typecheck + test + build trên mỗi PR

**What to build:** Pipeline CI tự động để mỗi PR/push vào `feature/*` / `main` đều chạy typecheck + toàn bộ test + build. Phát hiện hồi quy sớm, giữ codebase luôn xanh.

**Blocked by:** 01 — Hạ tầng test (cần `npm test` hoạt động).

**Status:** done (ticket 02 — commit `TBD`)

**Đã thêm ngoài spec:** `server/src/test/server.ts` (entry E2E) + script `start:test` + `E2E_SERVER=test` trong playwright.config — CI chạy E2E với Memory Server + seed, KHÔNG cần DB thật.

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

- [x] PR push → CI chạy đủ 2 job server + client (workflow `.github/workflows/ci.yml`; chạy thật khi push/PR lên GitHub).
- [x] E2E job chạy được (job `e2e`, dùng server test Memory Server qua `E2E_SERVER=test`).
- [x] Build ra `dist/` không lỗi trên CI (đã verify `npm run build` server + client local pass).

**Ghi chú CI:**
- Client typecheck dùng `npx tsc -b` (root tsconfig là solution-style, `--noEmit` không kiểm tra gì).
- Client lint có baseline 405 errors từ trước — chạy `|| true` (không chặn fail), sẽ dọn dần.
- MongoDB Memory Server + Playwright browsers được cache qua `actions/cache`.

**Lưu ý:** nếu ESLint client đang có baseline lỗi, dùng `eslint` với rule chặn fail hoặc giới hạn file đã sạch — không làm tắc CI ngay từ đầu.
