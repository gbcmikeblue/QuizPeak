#!/usr/bin/env bash
# 数据库 + 上传文件备份
# 用法：
#   ./deploy/backup.sh              # 使用 docker compose 中的 postgres 容器
#   LOCAL=1 ./deploy/backup.sh      # 本机直接跑 pg_dump（需已安装 postgresql-client 且配置 DATABASE_URL）
# 建议 crontab：0 3 * * * cd /opt/quizpeak && ./deploy/backup.sh >> logs/backup.log 2>&1

set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
PG_SERVICE="${PG_SERVICE:-postgres}"
DB_USER="${POSTGRES_USER:-quizpeak}"
DB_NAME="${POSTGRES_DB:-quizpeak}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%F %T')] 开始备份"

# 1. 数据库
DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
if [[ "${LOCAL:-0}" == "1" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "LOCAL=1 需要先 export DATABASE_URL" >&2
    exit 1
  fi
  pg_dump "$DATABASE_URL" | gzip -9 > "$DB_FILE"
else
  docker compose exec -T "$PG_SERVICE" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip -9 > "$DB_FILE"
fi
echo "  数据库 -> $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# 2. 上传文件（用户头像/Banner 图片）
if [[ -d uploads ]]; then
  UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
  tar -czf "$UP_FILE" uploads
  echo "  上传文件 -> $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"
elif docker compose ps --status running --services 2>/dev/null | grep -qx api; then
  UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
  docker compose exec -T api tar -czf - -C /app uploads > "$UP_FILE"
  echo "  上传文件 -> $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"
else
  echo "  跳过上传文件（未找到 uploads 目录）"
fi

# 3. 清理过期备份
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -name '*.gz' -mtime "+$RETENTION_DAYS" -print -delete | wc -l | tr -d ' ')
echo "  清理过期备份：$DELETED 个（保留 ${RETENTION_DAYS} 天）"

echo "[$(date '+%F %T')] 备份完成"
