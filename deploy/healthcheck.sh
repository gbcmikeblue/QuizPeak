#!/usr/bin/env bash
# 健康检查 + 告警（可接入 cron 每分钟执行）
# 用法：
#   ./deploy/healthcheck.sh
#   ALERT_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx ./deploy/healthcheck.sh
#
# 退出码：0 全部正常，1 有异常（便于 cron/systemd 判断）

set -uo pipefail

API="${API_BASE:-http://localhost:8080}"
WEB="${WEB_BASE:-http://localhost:3000}"
ADMIN="${ADMIN_BASE:-http://localhost:3001}"
WEBHOOK="${ALERT_WEBHOOK_URL:-}"

FAILED=0
REPORT=""

check() {
  local name="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    REPORT+="✔ ${name} ${code}"$'\n'
  else
    REPORT+="✖ ${name} ${code}（期望 ${expect}） ${url}"$'\n'
    FAILED=1
  fi
}

check "API 健康"  "${API}/api/health"   200
check "用户端"    "${WEB}/"             200
check "后台登录"  "${ADMIN}/login"      200

# 数据库连通性（health 接口内含 db 状态）
DB_STATE=$(curl -s -m 5 "${API}/api/health" | grep -o '"db":"[a-z]*"' | cut -d'"' -f4 || echo "unknown")
if [[ "$DB_STATE" != "up" ]]; then
  REPORT+="✖ 数据库状态 ${DB_STATE}"$'\n'
  FAILED=1
else
  REPORT+="✔ 数据库 up"$'\n'
fi

# 磁盘占用（>85% 告警）
USED=$(df -h / | awk 'NR==2 {gsub("%","",$5); print $5}')
if [[ -n "$USED" && "$USED" -ge 85 ]]; then
  REPORT+="✖ 磁盘使用 ${USED}%"$'\n'
  FAILED=1
else
  REPORT+="✔ 磁盘 ${USED:-?}%"$'\n'
fi

TIMESTAMP="$(date '+%F %T')"
echo "[$TIMESTAMP]"
printf '%s' "$REPORT"

if [[ "$FAILED" == "1" && -n "$WEBHOOK" ]]; then
  TEXT="[知巅 QuizPeak 告警] ${TIMESTAMP}\n${REPORT}"
  # 钉钉/飞书/企微通用 text 消息体
  curl -s -m 5 -H 'Content-Type: application/json' \
    -d "$(printf '{"msgtype":"text","text":{"content":"%s"}}' "$(printf '%s' "$TEXT" | sed ':a;N;$!ba;s/\n/\\n/g')")" \
    "$WEBHOOK" > /dev/null || true
  echo "（已推送告警）"
fi

exit "$FAILED"
