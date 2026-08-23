#!/usr/bin/env bash
# 碳迹 · 一键启动前后端（在 WSL 内运行）
# 幂等：端口已在监听则跳过，不会重复启动
set -u

ROOT="/mnt/a/Robin/清华绿色创新挑战赛"
BACKEND="$ROOT/Carbon_Circle-main"
FRONTEND="$ROOT/web"
BK_LOG="/tmp/carbon-backend.log"
FE_LOG="/tmp/carbon-frontend.log"

echo "🌱 碳迹 · 启动前后端..."

# ── 后端 (FastAPI :8000) ──
if ss -ltn 2>/dev/null | grep -q ':8000 '; then
  echo "  ✅ 后端已在运行 (127.0.0.1:8000)"
else
  echo "  🚀 启动后端 (8000)..."
  cd "$BACKEND" || { echo "  ❌ 找不到后端目录 $BACKEND"; exit 1; }
  nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > "$BK_LOG" 2>&1 &
  echo "     PID $! · 日志 $BK_LOG"
fi

# ── 前端 (Vite :5173) ──
if ss -ltn 2>/dev/null | grep -q ':5173 '; then
  echo "  ✅ 前端已在运行 (5173)"
else
  echo "  🚀 启动前端 (5173)..."
  cd "$FRONTEND" || { echo "  ❌ 找不到前端目录 $FRONTEND"; exit 1; }
  nohup npm run dev > "$FE_LOG" 2>&1 &
  echo "     PID $! · 日志 $FE_LOG"
fi

# ── 等待端口就绪（最多 10 秒，轮询而非固定 sleep）──
echo "  等待服务就绪..."
for _ in $(seq 1 20); do
  if ss -ltn 2>/dev/null | grep -q ':8000 ' && ss -ltn 2>/dev/null | grep -q ':5173 '; then
    break
  fi
  sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎨 前端  http://localhost:5173"
echo "  🔧 后端  http://127.0.0.1:8000  (接口文档 /docs)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  停止服务：bash stop-dev.sh"
