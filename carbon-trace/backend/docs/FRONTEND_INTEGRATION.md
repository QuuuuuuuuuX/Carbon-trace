# 前端对接指南 · 个人碳账本 App

> 文档版本：v1.0 · 2026-08-23
> 目标读者：队友 A（前端 React + Vite + Tailwind + Phaser）
> 后端负责：海钺 · Phase 1 已跑通
> 转发后有问题找海钺（微信群 / 拉群）

---

## 1. 联调地址

| 环境 | URL |
|---|---|
| macOS 本地 | http://127.0.0.1:8000 |
| Ubuntu 云（待部署 8/24）| http://&lt;云IP&gt;:8000 |
| Swagger API 文档 | http://&lt;后端&gt;/docs |
| CORS | 开发期 `*`（后端已配好，可直调）|

**Headers**（除 `/api/auth/device` 外所有 API 必带）：
- `X-Device-Token: <uuid>` —— 设备 token，从 `/api/auth/device` 获取

---

## 2. 端到端用户流程

```
玩家首次进入
  → POST /api/auth/device          拿到 device_token
  → POST /api/auth/identify        绑定手机号+昵称
  → 进入主页
之后所有请求带 X-Device-Token 头
```

---

## 3. API 列表

### ✅ Phase 1 真实现（已跑通）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 服务存活 + 版本 |
| GET | `/healthz` | 健康检查 |
| GET | `/docs` | Swagger |
| POST | `/api/auth/device` | 创建设备 token（首次）|
| POST | `/api/auth/identify` | 绑定手机号+昵称 |
| GET | `/api/auth/me` | 查自己 |
| WS | `/ws/world` | 多人世界（**Phase 1 是 echo stub**）|

### 🟡 Phase 2 stub（返回 501，Phase 2 8/25-29 真实现）

| 方法 | 路径 | 计划 |
|---|---|---|
| POST | `/api/carbon/record` | 文字记碳：`{category, activity, value, unit}` → 算 kgCO₂ |
| POST | `/api/carbon/upload` | 拍照上传：`{image_base64}` → OCR 解析 → 算 kgCO₂ |
| GET | `/api/carbon/list?page=1&size=20` | 碳记录列表（按时间倒序）|
| GET | `/api/carbon/stats` | 分类占比 `{transport, electricity, food, consumption}` |
| POST | `/api/points/spend` | 消费积分 `{decoration_id}` |
| GET | `/api/points/log?page=1&size=20` | 积分流水 |
| GET | `/api/character/options` | 4 个角色 `[{id, name, asset_key, sprite_url, description}]` |
| POST | `/api/character/choose` | 选角色 `{character_id}` → 触发 LLM 生成 `ai_name/ai_personality/ai_advice` |
| GET | `/api/character/me` | 我的角色（含 LLM 生成字段）|

### 🟡 Phase 3 stub（8/30-9/2）

- `WS /ws/world` —— 多人位置同步 + 装饰物广播

---

## 4. 调用示例

### 创建设备 token（首次进入）

```bash
curl -X POST http://127.0.0.1:8000/api/auth/device
```

Response 200:
```json
{
  "device_token": "e9d1aa707def4aa1923f5953dcc9fbdb",
  "created": true,
  "message": "设备 token 已创建，请调用 /api/auth/identify 绑定手机号昵称"
}
```

### 绑定手机号昵称

```bash
curl -X POST http://127.0.0.1:8000/api/auth/identify \
  -H "X-Device-Token: e9d1aa707def4aa1923f5953dcc9fbdb" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000001","nickname":"forest_hero"}'
```

Response 200:
```json
{
  "device_token": "e9d1aa707def4aa1923f5953dcc9fbdb",
  "phone": "13800000001",
  "nickname": "forest_hero",
  "points": 0,
  "is_new_user": true
}
```

### 查自己

```bash
curl http://127.0.0.1:8000/api/auth/me \
  -H "X-Device-Token: e9d1aa707def4aa1923f5953dcc9fbdb"
```

### WebSocket（Phase 3 真实现后用）

```js
const ws = new WebSocket('ws://127.0.0.1:8000/ws/world');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'identify', device_token: '<token>' }));
};
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  console.log(msg);
};
```

**Phase 1 stub 行为**：连上后服务端发 `{type:'stub', message:'Phase 3 实现', phase:3}`，再发任何消息都会 echo 回来。可以用来测 WS 通了没。

---

## 5. 5 个演示账号（直接用）

跳过 `/device` + `/identify`，直接调任何带 token 的 API：

| nickname | phone | points | deco | device_token |
|---|---|---|---|---|
| forest_hero | 13800000001 | 0 | 0 | `demo000000000000000000000000forest01` |
| ocean_diver | 13800000002 | 500 | 1 | `demo000000000000000000000000ocean02` |
| sky_walker | 13800000003 | 2000 | 6 | `demo000000000000000000000000sky003` |
| earth_keeper | 13800000004 | 800 | 2 | `demo000000000000000000000000earth04` |
| super_admin | 13800000005 | 10000 | 10 | `demo000000000000000000000000super05` |

**用法**：直接用 `X-Device-Token: demo000000000000000000000000super05` 调任何带 token 的 API。路演现场评委可一键登顶。

---

## 6. 错误码体系

| 状态码 | 含义 | 例子 |
|---|---|---|
| 200 | 成功 | 正常 |
| 401 | 缺 token / token 无效 | 缺 X-Device-Token 头 |
| 422 | 请求体校验失败 | phone 不是 11 位 / nickname 超 32 字符 |
| 429 | 限流 | 1 秒内连发 2 次 `/identify` |
| 500 | 服务器内部错误 | DB 异常 |
| 501 | 路由未实现 | stub 路由 |

错误响应统一格式：
```json
{
  "detail": {
    "error": "<code>",
    "message": "<human readable>"
  }
}
```

---

## 7. CORS

后端已配 `ALLOWED_ORIGINS=*`（开发期）。你前端 Vite 默认 `localhost:5173` 可直调。**上线前**后端会改 `ALLOWED_ORIGINS=https://aihgt.site`，届时需要你前端在生产构建时打 aihgt.site 域名。

---

## 8. 数据格式约定

| 字段 | 格式 | 例子 |
|---|---|---|
| 时间戳 | ISO 8601 + 微秒 + 时区 | `2026-08-23T08:58:52.895227` |
| 数值 | float (kgCO₂) | 1.44 |
| 积分 | int | 500 |
| 分类 | string enum | `transport` / `electricity` / `food` / `consumption` |
| 单位 | string | `km` / `度` / `份` / `单` |

---

## 9. 阶段路线（来自 PRD §11）

- **Phase 0 立项**（8/22）✅
- **Phase 1 骨架**（8/23-24）✅ **你可以起步接 `/api/auth/device` + stub**
- **Phase 2 MVP**（8/25-29）—— 记碳→算碳→积分→角色成长
- **Phase 3 开放世界**（8/30-9/2）—— WS `/ws/world` 多人位置同步
- **Phase 4 打磨**（9/2-9/4）
- **Phase 5 比赛材料**（9/4-9/7）—— 队友 B 负责 PPT / 视频 / 1000 字

---

## 10. 你前端起步的最小动作

```bash
# 1. 起 React + Vite + Tailwind
npm create vite@latest web -- --template react-ts
cd web
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm i phaser axios
```

```ts
// src/api/client.ts
import axios from 'axios';

const TOKEN_KEY = 'carbon_device_token';

export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers['X-Device-Token'] = t;
  return cfg;
});

export async function ensureDeviceToken(): Promise<string> {
  let t = localStorage.getItem(TOKEN_KEY);
  if (t) return t;
  const { data } = await api.post('/api/auth/device');
  t = data.device_token;
  localStorage.setItem(TOKEN_KEY, t!);
  return t!;
}
```

```tsx
// 首次进入 App.tsx
useEffect(() => { ensureDeviceToken(); }, []);
```

---

## 11. 后端静态资源

队友 B 提供的角色 sprite / 装饰物素材**托管在后端**：
- `/static/characters/forest.png` 等（4 个）
- `/static/decorations/frame_green.png` 等（10 个）
- 你前端直接 `<img src="http://127.0.0.1:8000/static/characters/forest.png" />`

素材 URL 字段约定：DB 里 sprite_url 字段已经填好，前端从 API 拿直接用。

---

## 12. WebSocket 协议（Phase 3 草稿，待细化）

```jsonc
// 客户端 → 服务端
{ "type": "identify", "device_token": "..." }
{ "type": "move", "x": 100, "y": 200, "facing": "right" }
{ "type": "stop", "x": 100, "y": 200 }
{ "type": "heartbeat" }

// 服务端 → 客户端
{ "type": "welcome", "map_id": "default", "players": [...] }
{ "type": "player_join", "user_id": "...", "x": 0, "y": 0 }
{ "type": "player_move", "user_id": "...", "x": 100, "y": 200 }
{ "type": "player_leave", "user_id": "..." }
{ "type": "heartbeat_ack" }
```

Phase 3 实现时这份协议会更新到 `docs/ws-protocol.md`，前端的 WS 封装别锁死字段。

---

文档结束。**Phase 2（8/25）之前会更新所有 stub 为真实现**。有问题拉群找我（海钺）—— 不要猜。
