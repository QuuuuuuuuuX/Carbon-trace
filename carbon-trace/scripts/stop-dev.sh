#!/usr/bin/env bash
# 碳迹 · 停止前后端（在 WSL 内运行）
set -u

echo "🌱 碳迹 · 停止前后端..."

# 停止后端（监听 8000 的进程）
BK_PID=$(ss -ltnp 2>/dev/null | grep ':8000 ' | grep -oP 'pid=\K[0-9]+' | head -1)
if [ -n "$BK_PID" ]; then
  kill "$BK_PID" 2>/dev/null && echo "  ✅ 已停止后端 (PID $BK_PID)"
else
  echo "  ⚠️  后端未在运行"
fi

# 停止前端（监听 5173 的进程，可能含子进程）
FE_PIDS=$(ss -ltnp 2>/dev/null | grep ':5173 ' | grep -oP 'pid=\K[0-9]+' | sort -u)
if [ -n "$FE_PIDS" ]; then
  for p in $FE_PIDS; do kill "$p" 2>/dev/null; done
  echo "  ✅ 已停止前端 (PID $FE_PIDS)"
else
  echo "  ⚠️  前端未在运行"
fi

echo "完成。"
