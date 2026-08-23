# 后端 PRD · 个人碳账本 App · 清华绿创赛方案 B

> 文档版本：v1.0 · 2026-08-23 · 负责人：海钺（后端）
> 截止日期：2026-09-07
> 团队：西交利物浦大学 3 人（海钺·后端 / 队友 A·前端 / 队友 B·AI+材料）
> 参赛：清华绿色创新挑战赛 · 赛道一·AI 赋能环境治理

---

## 1. 项目背景

参赛「清华绿色创新挑战赛」赛道一·AI 赋能环境治理。作品：**Web 端养成类小游戏 + AI 画像 + 碳积分 + 泰拉瑞亚风 2D 开放世界**。玩家通过记录碳足迹获得积分，用积分在 2D 开放世界里养成 AI 角色、装扮、与他人互动。

产品形态：玩家拥有一个 AI 生成设定的虚拟角色，通过记录碳足迹获得积分，用积分在泰拉瑞亚风的多人 2D 开放世界里养成、装扮、与他人互动。

PDF 全文：`清华绿创赛_方案B工作流_v2.pdf`（v2 时间线与分工）。

---

## 2. 后端范围（我的职责）

| 域 | 范围 |
|---|---|
| FastAPI 业务 API | 用户 / 碳记录 / 积分 / 角色 / 世界 / 装饰物 |
| 碳核算引擎 | 活动数据 → 排放因子 → kgCO₂ |
| 积分系统 | 4 种规则并行（见 §6）|
| WebSocket 多人世界 | 全球一房 + 位置同步 + 装饰物 |
| 数据库 | SQLite（10 张表）|
| LLM 集成 | DeepSeek（角色设定 / 减排建议 / 活动解析）|
| OCR 集成 | 中转到队友 B 的端点 |
| 部署 | systemd + Ubuntu 云服务器 |

**不在范围**：
- 前端 UI（队友 A 负责：React + Vite + Tailwind + Phaser 3）
- LLM / OCR 模型本身（队友 B 负责，prompt 我写）
- 路演 PPT / 3 分钟视频 / 1000 字介绍（队友 B 负责）
- 域名 aihgt.site 备案（已备过，DNS + HTTPS 待办）

---

## 3. 用户故事（核心闭环）

1. **首次进入**：玩家打开页面 → 自动生成 device_token → 输入手机号 + 昵称 → 进入主页
2. **记碳（表单）**：选「打车 / 地铁 / 10度电 / 牛肉饭」中一项 → 填数值 → 提交 → 后端算 kgCO₂ → 写记录 + 算积分 + 调 DeepSeek 生成减排建议 → 前端展示
3. **记碳（拍照）**：拍照小票 → 上传到后端 → 后端转发 OCR → OCR 识别出活动类型 → 后端算 kgCO₂ → 同上
4. **看碳账本**：列表显示所有记录，分类占比饼图
5. **选角色**：4 个固定角色选 1 → 后端调 DeepSeek 生成角色名 / 性格 / 专属建议 → 展示角色卡
6. **进世界**：WebSocket 连接全球一房 → 广播位置 → 看到其他玩家
7. **消费积分**：在商店买装饰物 / 头像框 → 放在地图上 → 其他玩家可见
8. **连续打卡**：每天至少记一笔碳 → 累计打卡天数 → 额外积分

---

## 4. 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 语言 | Python 3.11+ | 老大熟悉（Real-voice 经验）|
| Web 框架 | FastAPI | 异步 / 自动 /docs / 内置 WebSocket |
| ORM | SQLAlchemy 2.0 | Python 主流 / 迁移方便 |
| 验证 | Pydantic v2 | FastAPI 同生态 |
| 数据库 | SQLite | 单文件 / 零运维 / 赛期够用 |
| 限流 | slowapi | Flask-Limiter 的 FastAPI 移植 |
| 进程管理 | systemd | Ubuntu 原生 |
| DeepSeek | openai SDK 异步 | DeepSeek 兼容 OpenAI API |
| 日志 | loguru | 比 stdlib 简单 |
| HTTP 客户端 | httpx | 异步 / OCR 转发 |

---

## 5. 数据模型（10 张表）

| 表 | 用途 | 主键 |
|---|---|---|
| `user` | 用户主表（device_token + 手机号 + 昵称 + 积分余额）| `device_token` |
| `character` | 4 行固定（森林 / 海洋 / 天空 / 大地）| `id` |
| `user_character` | 当前选择 + LLM 生成的命名/性格/建议 | `user_id` |
| `carbon_record` | 碳记录（活动类型 + 数值 + 单位 + kgCO₂）| `id` 自增 |
| `points_log` | 积分流水（增/减/原因/关联 ID）| `id` 自增 |
| `user_streak` | 连续打卡状态（最后打卡日 + 累计天数）| `user_id` |
| `decoration` | 装饰物图鉴（名称 + 资源 key + 价格）| `id` |
| `user_decoration` | 玩家已购 + 地图坐标（NULL = 在背包）| `(user_id, decoration_id)` |
| `world_snapshot` | 断线恢复（位置 + 朝向）| `user_id` |
| `emission_factor_log` | 因子库版本追踪（可选）| `version` |

详细字段见 `backend/app/models/`。

---

## 6. 积分规则（MVP 全做，🔴 风险标记）

| 规则 | 实现 | 公式（初版，待 8/24 调）|
|---|---|---|
| ① 固定分 | 每条 +10 | `change = 10` |
| ② 减排量比例 | 碳排越低奖励越高 | `change = round(max(0, 10 - co2_kg * 2))` |
| ③ 分类差异化 | 步行 +20 / 打车 -5 / 用电 +0 / 素食 +15 | 查表 `points_per_type` |
| ④ 连续打卡 | 第 N 天额外 +N×5 | 状态机 + 跨日处理 |

> 🔴 风险：4 套规则一周内全做完只剩 0.5 天 buffer。**8/29 联调撞墙时再评估降级**——优先砍 ④ 连续打卡。

---

## 7. API 端点

### Phase 1 实现（8/24 必通）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 服务存活 + 版本 |
| GET | `/healthz` | 健康检查 |
| GET | `/docs` | FastAPI Swagger |
| POST | `/api/auth/device` | 创建设备 token（首次） |
| POST | `/api/auth/identify` | 手机号 + 昵称绑定 |

### Phase 2 stub（占位 501，Phase 2 实装）

- `POST /api/carbon/record` 文字记碳
- `POST /api/carbon/upload` 拍照上传
- `GET /api/carbon/list` 记录列表
- `GET /api/carbon/stats` 分类占比
- `POST /api/points/spend` 消费积分
- `GET /api/points/log` 积分流水
- `GET /api/character/options` 4 个角色
- `POST /api/character/choose` 选角色 + 触发 LLM
- `GET /api/character/me` 我的角色

### Phase 3 stub

- `WS /ws/world` 多人世界

---

## 8. 关键中间件

| 中间件 | 行为 |
|---|---|
| DeviceTokenMiddleware | 所有 `/api/*` 校验 `X-Device-Token` 头，未注册 → 401 |
| CORS | 开发期 `*`，上线前改 `*.aihgt.site` |
| slowapi 限流 | 记碳 1 次/3s · 登录 1 次/s · WebSocket 1 连接/设备 |
| DeepSeek 异步队列 | asyncio.Queue 串行化，失败 fallback 默认建议 |

---

## 9. 排放因子库

`backend/app/data/emission_factors.json`：

```json
{
  "version": "v1.0",
  "updated_at": "2026-08-23",
  "factors": [
    {
      "category": "transport",
      "activity": "打车",
      "unit": "km",
      "factor_kgco2_per_unit": 0.18,
      "source": "IPCC 数据库 / 国家发改委《企业温室气体排放核算方法与报告指南》"
    }
  ]
}
```

初期覆盖 3 类：**交通**（km）/ **饮食**（份）/ **用电**（度）。
消费和废弃物 Phase 4 再补。

---

## 10. 演示账号（seed 5 个）

| nickname | character | points | decorations |
|---|---|---|---|
| `forest_hero` | 森林 | 0 | 无（新手状态）|
| `ocean_diver` | 海洋 | 500 | 1 头像框 |
| `sky_walker` | 天空 | 2000 | 5 装饰物 + 全头像框 |
| `earth_keeper` | 大地 | 800 | 2 装饰物 |
| `super_admin` | 天空 | 10000 | 全部（路演顶配演示）|

手机号 `13800000001~05`，device_token 固定 UUID 写入 seed 脚本。

---

## 11. 里程碑

| 阶段 | 日期 | 后端任务 |
|---|---|---|
| Phase 0 | 8/22 | 立项对齐 ✅ |
| Phase 1 | 8/23-24 | FastAPI 骨架 + SQLite 表 + /docs + seed |
| Phase 2 | 8/25-29 | MVP 核心闭环（记碳 → 算碳 → 积分 → 角色成长）|
| Phase 3 | 8/30-9/2 | 开放世界（WebSocket 位置同步 + 装饰物）|
| Phase 4 | 9/2-9/4 | 打磨（性能 / 并发 / 演示账号 / 部署 / 手机适配）|
| Phase 5 | 9/4-9/7 | 比赛材料（队友 B 负责：PPT / 视频 / 1000 字介绍）|

---

## 12. 风险与依赖

| 风险 | 等级 | 应对 |
|---|---|---|
| 4 种积分规则 MVP 全做 | 🔴 高 | 8/29 联调时再评估降级 |
| 单 worker + SQLite 并发 | 🟡 中 | Phase 4 切 PostgreSQL 或开 WAL |
| DeepSeek 失败 | 🟡 中 | 超时 10s + fallback 默认建议 |
| OCR 队友 B 未就绪 | 🟡 中 | Phase 1 upload 路由先 mock |
| 域名 aihgt.site 未绑 | 🟡 中 | 9/4 前绑 DNS + 配 HTTPS |
| 队友协作断链 | 🟢 低 | 每日站会（PDF 提到）|
| 因子库覆盖不全 | 🟢 低 | MVP 3 类够用，Phase 4 补消费/废弃物 |

---

## 13. 接口协作（与前端 / AI 队友 B）

| 边界 | 谁负责 | 协议 |
|---|---|---|
| DeepSeek key | 后端持有 | 环境变量 `.env` |
| LLM prompt | 后端写 | 全部 prompt 在后端 `services/prompts/` |
| OCR 调用 | 后端发起 | `POST 队友B/ocr {image_base64}` → `{activity, value, unit}` |
| WebSocket 协议 | 后端定义 | JSON 消息，文档见 `docs/ws-protocol.md` |
| 角色 sprite 资源 | 队友 B 提供 | 静态文件托管在后端 `/static/characters/` |
| 装饰物素材 | 队友 B 提供 | 静态文件托管在后端 `/static/decorations/` |

---

## 14. 验收标准（Phase 1）

- [ ] `curl http://服务器:8000/` 返回 200 + 版本信息
- [ ] `curl http://服务器:8000/healthz` 返回 `{"status": "ok"}`
- [ ] `curl http://服务器:8000/docs` 返回 Swagger UI
- [ ] `POST /api/auth/device` 创建设备 token，返回 UUID
- [ ] `POST /api/auth/identify` 绑定手机号 + 昵称，成功
- [ ] `scripts/seed_demo.py` 跑完后，DB 有 5 个演示账号
- [ ] systemd service enable + start，restart 后自动拉起
- [ ] `/api/carbon/*` `/api/points/*` `/api/character/*` `/ws/world` 返回 501

---

文档结束。下次更新：Phase 1 完成后。
