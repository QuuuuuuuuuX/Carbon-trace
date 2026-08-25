# GitHub 更新包 · 2026-08-24 ~ 08-25

> 碳衡物语（清华绿色创新挑战赛 · 方案B）前端更新，由 Robin 整理（2026-08-25）

## 这个文件夹是什么

把 8/24 ~ 8/25 两天改动的**全部文件**按原仓库目录结构抽出，直接覆盖到 GitHub clone 即可。

## 更新内容摘要

### 🎨 8/24（WorldScene 大升级 + OCR + 改名）
- WorldScene 像素风 v0.5：3 群系（森林/沙漠/雪原）、昼夜循环 100s、双层视差远山、12x16 像素角色模板、飘云
- 地形连续修复：大画布整体绘制（去方块格子感）；碰撞连续修复：每列连续实体柱（600→120 body）
- Record 页 OCR 拍照识别小票/账单（压缩→上传→结果卡，失败退回手动记账）
- 项目定名「碳衡物语」（原占位「碳迹」，index.html / Login / 角色 / 世界 / 页脚全改名）
- 新增 `scripts/mock-ocr-server.py`（9001 端口，队友B 真 OCR 服务就绪后删除）
- 美术风格参考：`frontend/docs/大世界美术风格参考_泰拉瑞亚.md`

### ✅ 8/25（Phase 2 前端闭环 + Phase 3 WS 骨架）
- Home 今日碳足迹接真实数据（stats 累计 + list 过滤今日求和，含加载态）
- Profile 开通「我的碳账本」入口 + 新增积分流水（最近 5 条，正绿负红）
- 新增 `frontend/src/game/net/worldClient.js`：WS 客户端骨架（identify → 位置同步 10Hz/1Hz 节流 → 心跳 10s → 断线指数退避重连 → leave）
- World 页接入 WorldClient，状态显示"在线 N 人"（⚠️ 协议字段以 8/29 联调定稿为准）
- api 三处过时注释更新（carbon / character / points）

## 怎么更新到 GitHub

```bash
# 1. clone 仓库（GitHub 慢就挂代理/镜像）
git clone https://github.com/Terrence20070515/Carbon_Circle.git
cd Carbon_Circle

# 2. 先拉队友最新代码
git pull

# 3. 把本文件夹内容整体覆盖进去（保持目录结构，Windows 直接复制粘贴即可）
#    命令行为：
#    cp -r <本文件夹>/* .

# 4. 提交 + 推送
git add .
git commit -m "feat(frontend): Phase2 闭环 + Phase3 WS 骨架（8/24-8/25）"
git push
```

## ⚠️ 注意事项

1. **不要提交本地数据/缓存**：`backend/data/carbon.db`、`__pycache__/` 不要 `git add`（检查 .gitignore 是否已忽略）
2. **push 前先 pull**：队友 8/24 部署服务器后可能推过代码，先合并避免冲突
3. **frontend 是海钺负责**：如队友也改过 frontend，建议先确认再整体覆盖
4. `frontend/package-lock.json` 是 npm 安装后更新的锁文件，可一并提交（保持依赖版本一致）
5. `backend/app/data/emission_factors.json` 是 13 因子排放库（本地 8/24 补全），如服务器/远程已有则跳过
