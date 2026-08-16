#!/usr/bin/env bash
# run.sh — Chạy load test queue end-to-end trên môi trường LOCAL (KHÔNG đụng Atlas).
#
# Các bước: khởi động Mongo+Redis local in Docker → build server → seed 50 nhà
# hàng vào Mongo LOCAL → start server (ENABLE_REDIS=true, RATE_LIMIT_ENABLED=false)
# → k6 tạo tải (order-flow.js) → in báo cáo.
#
# Yêu cầu: docker, node >= 20, k6 (brew install k6).
# Cách dùng: ./loadtest/run.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT/server"
LOADTEST_DIR="$ROOT/loadtest"
TEST_DATA="$LOADTEST_DIR/test-data.json"

# ── 1. Cấu hình môi trường local (mọi thứ KHÁC hẳn .env — cực kỳ quan trọng) ──
LOCAL_MONGO_URI="mongodb://localhost:27099/restaurant"
LOCAL_REDIS_URL="redis://localhost:6380"
MONGO_PORT=27099
REDIS_PORT=6380
MONGO_NAME=lt-mongo-27099
REDIS_NAME=lt-redis-6380
API_PORT=8000
BASE_URL="http://localhost:${API_PORT}"
# SMOKE=1 → kịch bản ngắn (2→4 VU, ~45s) để verify luồng trước khi chạy full.
SMOKE="${SMOKE:-}"

# ── 2. Đảm bảo Mongo + Redis local đang chạy ─────────────────────────────────
ensure_container() {
  local name=$1 image=$2 ports=$3 docker_cmd_args=$4
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    echo "[infra] $name đang chạy"
    return 0
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
    echo "[infra] start lại $name..."
    docker start "$name" >/dev/null
    return 0
  fi
  echo "[infra] tạo $name ($image)..."
  # shellcheck disable=SC2086
  docker run -d --name "$name" --restart unless-stopped -p "$ports" "$image" $docker_cmd_args >/dev/null
}

# Mongo chạy chế độ replica set (order.service.ts tạo order dùng transaction).
# Bind đúng port {MONGO_PORT} NGAY TRONG container để host trong rs.initiate
# ('localhost:{MONGO_PORT}') khớp với Server kết nối từ bên ngoài.
ensure_container "$MONGO_NAME" "mongo:7" "${MONGO_PORT}:${MONGO_PORT}" \
  "--replSet rs0 --port ${MONGO_PORT} --bind_ip_all"
ensure_container "$REDIS_NAME" redis:7-alpine "${REDIS_PORT}:6379" ""

# Chờ Mongo sẵn sàng
echo "[infra] chờ Mongo nhận connection..."
until docker exec "$MONGO_NAME" mongosh --quiet --port "$MONGO_PORT" --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q 1; do
  sleep 1
done

# Khởi tạo replica set (nếu chưa — idempotent). Member dùng host localhost:{MONGO_PORT}
# vì container giờ bind đúng port này nên {host:{MONGO_PORT}} ↔ {container:{MONGO_PORT}}.
RS_STATE=$(docker exec "$MONGO_NAME" mongosh --quiet --port "$MONGO_PORT" --eval "try{rs.status().ok}catch(e){0}" 2>/dev/null)
if [ "$RS_STATE" != "1" ]; then
  echo "[infra] khởi tạo replica set 'rs0'..."
  docker exec "$MONGO_NAME" mongosh --quiet --port "$MONGO_PORT" --eval \
    "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:${MONGO_PORT}'}]})" >/dev/null 2>&1
  sleep 4
  # Chờ primary lên
  until docker exec "$MONGO_NAME" mongosh --quiet --port "$MONGO_PORT" --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q 1; do
    sleep 1
  done
fi

# ── 3. Build server ───────────────────────────────────────────────────────────
echo "[build] tsc..."
(cd "$SERVER_DIR" && npm run build >/dev/null)

# ── 4. Seed 50 nhà hàng vào Mongo LOCAL ───────────────────────────────────────
echo "[seed] seed 50 nhà hàng vào Mongo local ($LOCAL_MONGO_URI)..."
(cd "$SERVER_DIR" && MONGODB_URL="$LOCAL_MONGO_URI" node scripts/seed-loadtest.mjs \
  --out "$TEST_DATA" 2>&1 | sed 's/^/  /')

# ── 5. Chạy server local (ENABLE_REDIS + queue thật, rate limit tắt) ──────────
echo "[server] start server trên :${API_PORT}..."
(
cd "$SERVER_DIR"
PORT="$API_PORT" \
  MONGODB_URL="$LOCAL_MONGO_URI" \
  ENABLE_REDIS=true \
  REDIS_URL="$LOCAL_REDIS_URL" \
  RATE_LIMIT_ENABLED=false \
  NODE_ENV=production \
  nohup node dist/index.js > /tmp/lt-server.log 2>&1 &
)
SERVER_PID=$(pgrep -f "node dist/index.js" | head -1)
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

echo "[server] chờ server lên (health) + Bull Board mount..."
until curl -sf "$BASE_URL/healthz" >/dev/null 2>&1; do
  sleep 1
done
until curl -sf "$BASE_URL/api/queues/api/queues" >/dev/null 2>&1; do
  echo "  chờ Bull Board mount..."
  sleep 1
done
echo "[server] sẵn sàng ✅"

# ── 6. Chạy k6 ────────────────────────────────────────────────────────────────
K6_ARGS=(run -e BASE_URL="$BASE_URL" -e TEST_DATA="test-data.json")
if [ -n "$SMOKE" ]; then
  K6_ARGS+=(-e SMOKE=1)
fi
K6_ARGS+=(--summary-export "$LOADTEST_DIR/summary.json")
K6_ARGS+=(--out json="$LOADTEST_DIR/results.json")
K6_ARGS+=("$LOADTEST_DIR/order-flow.js")

echo "[k6] bắt đầu tải (Ctrl-C để dừng, kết quả ghi vào loadtest/summary.json)..."
k6 "${K6_ARGS[@]}"

echo "[done] Xem báo cáo: loadtest/summary.json (+ results.json cho phân tích sâu)"