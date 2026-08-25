// 碳记录 API（Phase 2 已实现 · 8/25 本地全链路验证 ✓）
import { api } from './client'

// 文字记碳：{ category, activity, value, unit } → kgCO₂
export const recordCarbon = (payload) =>
  api.post('/carbon/record', payload).then((r) => r.data)

// 拍照上传：{ image_base64 } → OCR 解析 → 算碳（OCR 服务最长 15s，客户端超时放宽到 20s）
export const uploadCarbon = (imageBase64) =>
  api.post('/carbon/upload', { image_base64: imageBase64 }, { timeout: 20000 }).then((r) => r.data)

// 碳记录列表（按时间倒序）
export const fetchCarbonList = (page = 1, size = 20) =>
  api.get('/carbon/list', { params: { page, size } }).then((r) => r.data)

// 分类占比 { transport, electricity, food, consumption }
export const fetchCarbonStats = () =>
  api.get('/carbon/stats').then((r) => r.data)
