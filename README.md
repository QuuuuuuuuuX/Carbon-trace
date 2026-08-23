# Carbon-trace
# 碳迹 · 个人碳账本 App

清华绿色创新挑战赛 · 赛道一「AI 赋能环境治理」· 方案 B

> 养成类游戏化 + AI 画像 + 碳积分 + 泰拉瑞亚风 2D 开放世界
> 玩家记录碳足迹获得积分，用积分养成 AI 角色、装扮、在开放世界互动

---

## 技术栈

| 端 | 技术 |
|---|---|
| 后端 | FastAPI + SQLAlchemy 2 + SQLite + slowapi + DeepSeek |
| 前端 | React 18 + Vite 8 + Tailwind v4 + Phaser 4.2.1 + axios + react-router |

## 目录结构

```
carbon-trace/
├── backend/      # 后端 API（FastAPI，端口 8000）
├── frontend/     # 前端（Vite，端口 5173，proxy /api+/ws → 8000）
├── scripts/      # 一键启动脚本（start-dev.sh / stop-dev.sh / 一键启动.bat）
└── progress/     # 进度记录 + 设计学习笔记
```

## 已实现功能（截至 2026-08-23）

### 后端（Phase 1 + Phase 2 全部）
- 认证：`/api/auth/device` → `/identify` → `/me`（X-Device-Token 头）
- 碳记录：`/api/carbon/record`（文字记碳→算碳→积分）、`upload`、`list`、`stats`
- 积分：`/api/points/spend`、`log`
- 角色：`/api/character/options`、`choose`（LLM 生成设定）、`me`
- **4 套积分规则并行**：固定+10 / 减排比例 / 分类差异化（步行+20 打车-5 素食+15）/ 连续打卡 N×5
- 碳核算引擎：13 个排放因子（IPCC/发改委/生态环境部）

### 前端
- 页面：登录（含 5 演示账号）、主页、记碳、碳账本、角色、我的
- 底部 Tab 导航（记碳为中央凸起大按钮）+ 启动动画
- 设计系统：深森林绿 `#176341`（参考 SURF）+ 双语义色（环保绿/琥珀积分）
- 开放世界：Phaser 泰拉瑞亚风（方块地形 + 4 固定角色 + 摄像机跟随 + 电脑 A/D 空格 + 手机虚拟摇杆）

## 运行方式

### 后端
```bash
cd backend
pip install -r requirements.txt
python scripts/init_db.py        # 建表 + 排放因子
python scripts/seed_demo.py      # 4 角色 + 10 装饰物 + 5 演示账号
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

> `scripts/` 里的一键启动脚本含本机 A 盘绝对路径，clone 后需按实际环境改路径。

## 演示账号

| nickname | 积分 | X-Device-Token |
|---|---|---|
| forest_hero | 0 | `demo000000000000000000000000forest01` |
| ocean_diver | 500 | `demo000000000000000000000000ocean02` |
| sky_walker | 2000 | `demo000000000000000000000000sky003` |
| earth_keeper | 800 | `demo000000000000000000000000earth04` |
| super_admin | 10000 | `demo000000000000000000000000super05` |

## 待办

- [ ] 开放世界摄像机跟随需真机验证（Phaser 4 渲染）
- [ ] Phase 3 多人世界（WS `/ws/world`）
- [ ] 记碳结果具象化（减排 → 种树/省电比喻）
- [ ] 配 `.env` 的 `deepseek_api_key` 让角色 AI 设定真实生成
