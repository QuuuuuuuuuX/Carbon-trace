# 碳迹 · 个人碳账本 — 前端

清华绿色创新挑战赛 · 赛道一 AI 赋能环境治理 · 方案 B 个人碳账本 App

## 技术栈

- React 18 + Vite
- Tailwind CSS v4
- Phaser 3（泰拉瑞亚风 2D 开放世界）

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物在 dist/
```

开发服务器已配置代理：`/api` 和 `/ws` → `http://127.0.0.1:8000`（后端 FastAPI）。

## 当前进度

- [x] 脚手架（React + Vite + Tailwind + Phaser）
- [x] Phaser 测试场景（像素小人移动 + 跳跃，验证引擎可用）
- [x] API client 层（axios 实例 + X-Device-Token 拦截器 + 各域接口封装）
  - `src/api/client.js`（token 管理）· `auth.js` / `carbon.js` / `points.js` / `character.js`
- [x] 登录/注册页（手机号+昵称绑定，含 5 个演示账号一键登顶）
- [x] 主页（功能入口 + 积分展示）
- [x] 角色选择页（4 选 1 + AI 设定展示，后端 Phase 2 联调后生效）
- [x] 世界页（Phaser 挂载 + WS 连通性检测）
- [x] 路由 + 鉴权守卫（无 token 自动回登录页）
- [ ] 记碳页（文字输入 + 拍照上传）—— Phase 2 联调后
- [ ] 碳账本页（列表 + 分类占比图）—— Phase 2 联调后
- [ ] 积分页/商店 —— Phase 2 联调后
- [ ] Phaser tilemap 横版世界 + 多人同步 —— Phase 3

> 工程名「碳迹」为占位，正式项目名待团队确认后统一改名。
