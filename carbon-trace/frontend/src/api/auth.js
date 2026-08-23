// 认证 API（Phase 1 已实现）
import { api } from './client'

// 创建设备 token（一般用 ensureDeviceToken() 即可）
export const createDevice = () => api.post('/auth/device').then((r) => r.data)

// 绑定手机号 + 昵称
export const identify = (phone, nickname) =>
  api.post('/auth/identify', { phone, nickname }).then((r) => r.data)

// 查自己（token 对应账号信息）
export const fetchMe = () => api.get('/auth/me').then((r) => r.data)
