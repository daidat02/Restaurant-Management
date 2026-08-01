#!/usr/bin/env bash
# =====================================================================
# Backup MongoDB bằng mongodump (chạy NGOÀI Render — disk của Render là ephemeral)
#
# Yêu cầu:
#   - Cài MongoDB Database Tools: https://www.mongodb.com/docs/database-tools/
#   - File server/.env có MONGODB_URL (hoặc export MONGODB_URL trước khi chạy)
#
# Cách chạy (từ thư mục repo):
#   bash server/scripts/backup.sh                 # backup + giữ 7 bản
#   KEEP=14 bash server/scripts/backup.sh          # giữ 14 bản
#
# Khuyến nghị: cron-job.org / UptimeRobot schedule chạy lệnh này mỗi 24h
# trên một máy bên ngoài (VD: GitHub Actions, máy nhà, VPS rẻ).
# =====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$SCRIPT_DIR/../backups}"
KEEP="${KEEP:-7}"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"

# Nạp MONGODB_URL từ server/.env nếu chưa có
if [[ -z "${MONGODB_URL:-}" ]] && [[ -f "$SCRIPT_DIR/../.env" ]]; then
  export "$(grep -E '^MONGODB_URL=' "$SCRIPT_DIR/../.env" | xargs)"
fi

if [[ -z "${MONGODB_URL:-}" ]]; then
  echo "ERROR: Thiếu MONGODB_URL. Export nó hoặc set trong server/.env" >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "ERROR: Không tìm thấy mongodump. Cài MongoDB Database Tools." >&2
  exit 1
fi

echo "Backup DB → $DEST"
mkdir -p "$DEST"
mongodump --uri "$MONGODB_URL" --out "$DEST"

# Xoá backup cũ hơn KEEP bản
cd "$BACKUP_ROOT"
COUNT="$(ls -1 | wc -l | tr -d ' ')"
if (( COUNT > KEEP )); then
  REMOVE=$(( COUNT - KEEP ))
  ls -1 | sort | head -n "$REMOVE" | xargs rm -rf
  echo "Đã xoá $REMOVE backup cũ, giữ lại $KEEP bản mới nhất."
fi

echo "Backup hoàn tất."
