// 积分 API（Phase 2 已实现 · 8/25 接入积分流水）
import { api } from './client'

// 消费积分买装饰：{ decoration_id }
export const spendPoints = (decorationId) =>
  api.post('/points/spend', { decoration_id: decorationId }).then((r) => r.data)

// 积分流水
export const fetchPointsLog = (page = 1, size = 20) =>
  api.get('/points/log', { params: { page, size } }).then((r) => r.data)
