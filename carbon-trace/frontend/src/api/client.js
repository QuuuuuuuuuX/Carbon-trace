// API 客户端：axios 实例 + 设备 token 管理
// 后端: FastAPI @ 127.0.0.1:8000（vite proxy /api → 8000）
// 协议: 除 /api/auth/device 外所有接口需带 X-Device-Token 头
import axios from 'axios'

const TOKEN_KEY = 'carbon_token'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器：自动带上 X-Device-Token
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) cfg.headers['X-Device-Token'] = t
  return cfg
})

// 响应拦截器：统一错误信息（后端错误格式 { detail: { error, message } }）
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail
    const msg =
      (detail && (typeof detail === 'string' ? detail : detail.message)) ||
      err.message ||
      '网络错误'
    return Promise.reject(new Error(msg))
  }
)

// 首次进入：拿设备 token（幂等，已有直接返回）
export async function ensureDeviceToken() {
  let t = localStorage.getItem(TOKEN_KEY)
  if (t) return t
  const { data } = await api.post('/auth/device')
  t = data.device_token
  localStorage.setItem(TOKEN_KEY, t)
  return t
}

export function getDeviceToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearDeviceToken() {
  localStorage.removeItem(TOKEN_KEY)
}
