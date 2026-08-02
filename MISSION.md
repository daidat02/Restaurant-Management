# Mission: Vận hành CI/CD cho restaurant_management

## Why
Dự án đang triển khai SaaS MVP với tốc độ cao (10 tickets liên tiếp). Pipeline tự động giúp mỗi lần push code lên GitHub đều được kiểm tra (typecheck + test + build + E2E) trước khi merge — phát hiện hồi quy sớm, giữ codebase luôn xanh trước khi deploy lên Render + Vercel.

## Success looks like
- Đọc được `.github/workflows/ci.yml` và giải thích từng job chạy gì, khi nào chạy, chạy ở đâu.
- Đọc được kết quả CI trên GitHub: hiểu ý nghĩa từng bước, biết cách xử lý khi job đỏ (log nào cần xem trước).
- Thêm/sửa được một bước trong workflow mà không làm vỡ pipeline (hiểu cú pháp YAML cơ bản).
- Giải thích được vai trò của cache (npm, mongodb binary, Playwright browsers) — tại sao CI nhanh/chậm.
- Chạy được tương đương toàn bộ pipeline ở local (typecheck, test, build, E2E) bằng đúng các lệnh CI dùng.

## Constraints
- Stack: server (Node 22, Vitest + MongoDB Memory Server), client (React + Vite, TS), E2E Playwright ở root.
- CI dùng GitHub Actions, runner `ubuntu-latest`, Node 22.
- KHÔNG đụng DB thật (Atlas) trong bất kỳ job nào — test/E2E dùng Memory Server.
- Client ESLint có baseline ~405 errors từ trước — tạm không chặn fail CI.
- Học bằng tiếng Việt, giữ nguyên thuật ngữ kỹ thuật tiếng Anh (pipeline, job, step, trigger, cache...).

## Out of scope
- Chi tiết deploy lên Render/Vercel (ticket 09–10 riêng).
- GitHub Actions nâng cao (matrix builds, reusable workflows, custom composite actions, self-hosted runner).
- Docker/Kubernetes.
