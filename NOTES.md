# Notes dạy học

## Sở thích của user
- Muốn học bằng tiếng Việt, giữ nguyên thuật ngữ kỹ thuật tiếng Anh.
- Học qua dự án thực tế (restaurant_management), không học lý thuyết trừu tượng.
- Thích giải thích ngay trong chat hơn là file HTML dài dòng (đã xác nhận ở phiên CI/CD).

## Mission hiện tại (đã chuyển từ React component API → CI/CD)
- Chủ đề học: **Vận hành CI/CD** — đọc hiểu `.github/workflows/ci.yml`, biết cách xử lý job đỏ, mở rộng pipeline.
- Xem MISSION.md để biết chi tiết Success/Constraints/Out-of-scope.

## Ngữ cảnh dự án
- Hạ tầng test (ticket 01, commit `2eb1bd4`): Vitest + supertest + MongoDB Memory Server; `server/src/test/{seed,utils,setup,globalSetup}.ts`; Playwright root.
- CI/CD (ticket 02, commit `25ad3d0`): `.github/workflows/ci.yml` — 3 job server/client/e2e.
- E2E server entry: `server/src/test/server.ts` (Memory Server + seed), script `start:test`, switch qua env `E2E_SERVER=test`.
- Lưu ý kỹ thuật đã phát hiện:
  - Client root tsconfig là solution-style (references) → typecheck CI phải dùng `tsc -b`, không dùng `tsc --noEmit`.
  - Client lint baseline 405 errors → workflow dùng `|| true` (không chặn fail).
  - Memory Server tải binary mongod ~100MB → cache `~/.cache/mongodb-binaries`.
  - vitest.config.ts nằm ngoài `rootDir` của server tsconfig → phải exclude khỏi build tsc (đã thêm ở ticket 01).
