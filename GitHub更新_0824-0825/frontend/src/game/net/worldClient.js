// 世界 WS 客户端（Phase 3 · 协议骨架）
// 连接 → identify → 位置同步（移动 10Hz / 静止 1Hz）→ 离开
// 心跳 10s；断线自动重连（指数退避，上限 30s）
// ⚠️ 后端 world.py 目前是 stub，消息字段以 8/29 联调定稿为准，改动集中在 handle()/build*()
import { getDeviceToken } from '../../api/client'

const HEARTBEAT_MS = 10_000
const MOVE_SYNC_MS = 100 // 10Hz
const IDLE_SYNC_MS = 1000 // 静止 1Hz
const MAX_RETRY_MS = 30_000

export default class WorldClient {
  constructor({ url, onStatus, onMessage } = {}) {
    this.url = url
    this.onStatus = onStatus || (() => {})
    this.onMessage = onMessage || (() => {})
    this.ws = null
    this.connected = false
    this.identified = false
    this.retryMs = 1000
    this.retryTimer = null
    this.heartbeatTimer = null
    this.syncTimer = null
    this.lastPos = null // { x, y, facing } 上次已发送位置
    this.closedByUser = false
  }

  connect() {
    this.closedByUser = false
    this._open()
  }

  _open() {
    this.onStatus('连接中…')
    let ws
    try {
      ws = new WebSocket(this.url)
    } catch {
      this._scheduleRetry()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      this.connected = true
      this.retryMs = 1000 // 成功后重置退避
      this.onStatus('已连接')
      this._identify()
      this._startHeartbeat()
    }

    ws.onmessage = (e) => {
      let msg
      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }
      this.handle(msg)
    }

    ws.onclose = () => {
      this._teardown()
      if (!this.closedByUser) {
        this.onStatus('连接断开，重连中…')
        this._scheduleRetry()
      } else {
        this.onStatus('已断开')
      }
    }

    ws.onerror = () => {
      // onclose 会随后触发，这里只提示
      this.onStatus('连接失败')
    }
  }

  _identify() {
    const token = getDeviceToken()
    if (!token) {
      this.onStatus('未登录')
      return
    }
    this.send({ type: 'identify', device_token: token })
    this.identified = true
  }

  // 位置同步：调用方在移动时调 syncPosition，内部按 10Hz 节流；
  // 静止时由调用方每 1s 调一次（或这里空闲检测）
  syncPosition(x, y, facing) {
    if (!this.connected || !this.identified) return
    const now = Date.now()
    const interval = this.lastPos ? MOVE_SYNC_MS : IDLE_SYNC_MS
    if (this._lastSyncAt && now - this._lastSyncAt < interval) return
    const moved = !this.lastPos || this.lastPos.x !== x || this.lastPos.y !== y || this.lastPos.facing !== facing
    if (!moved && this._lastSyncAt && now - this._lastSyncAt < IDLE_SYNC_MS) return
    this._lastSyncAt = now
    this.lastPos = { x, y, facing }
    this.send(this.buildPosition(x, y, facing))
  }

  // 离开世界时调（清理 + 通知服务器）
  leave() {
    this.send({ type: 'leave' })
  }

  send(obj) {
    if (this.ws && this.connected) {
      try {
        this.ws.send(JSON.stringify(obj))
      } catch {
        /* 忽略，断线由 onclose 处理 */
      }
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) this.send({ type: 'ping' })
    }, HEARTBEAT_MS)
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  _scheduleRetry() {
    this._stopRetry()
    this.retryTimer = setTimeout(() => {
      if (!this.closedByUser) this._open()
    }, this.retryMs)
    this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS)
  }

  _stopRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  _teardown() {
    this.connected = false
    this.identified = false
    this._stopHeartbeat()
  }

  // 服务端消息分发：协议定稿后在这里补字段
  handle(msg) {
    switch (msg.type) {
      case 'stub':
        this.onStatus(`stub: ${msg.message || ''}`)
        break
      case 'pong':
        break
      case 'welcome':
      case 'player_join':
      case 'player_leave':
      case 'players':
      case 'position':
      default:
        this.onMessage(msg)
    }
  }

  // ---- 协议构建：字段以联调定稿为准 ----
  buildPosition(x, y, facing) {
    return { type: 'position', x, y, facing }
  }

  destroy() {
    this.closedByUser = true
    this._stopRetry()
    this._stopHeartbeat()
    this.leave()
    try {
      this.ws?.close()
    } catch {
      /* ignore */
    }
    this.ws = null
    this.connected = false
  }
}
