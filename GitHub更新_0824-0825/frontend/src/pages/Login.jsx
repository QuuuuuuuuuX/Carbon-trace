// 登录页：首次进入 → 设备 token → 绑定手机号+昵称
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureDeviceToken } from '../api/client'
import { identify } from '../api/auth'
import { saveUser } from '../store/user'

// 演示账号（后端 seed 好的，可直接登顶测试）
const DEMO_ACCOUNTS = [
  { label: '森林守护者', token: 'demo000000000000000000000000forest01', nickname: 'forest_hero' },
  { label: '深海潜行者', token: 'demo000000000000000000000000ocean02', nickname: 'ocean_diver' },
  { label: '天空旅人', token: 'demo000000000000000000000000sky003', nickname: 'sky_walker' },
  { label: '大地守望者', token: 'demo000000000000000000000000earth04', nickname: 'earth_keeper' },
  { label: '超级管理员', token: 'demo000000000000000000000000super05', nickname: 'super_admin' },
]

export default function Login() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  // 每次进入登录页都重新初始化设备 token（登录态已在 App 入口重置）
  useEffect(() => {
    ensureDeviceToken()
      .then(() => setReady(true))
      .catch((e) => setError(`设备初始化失败：${e.message}`))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{11}$/.test(phone)) return setError('手机号需要是 11 位数字哦')
    if (!nickname.trim()) return setError('给自己起个昵称吧')
    if (nickname.length > 32) return setError('昵称最多 32 个字符')

    setLoading(true)
    try {
      const data = await identify(phone.trim(), nickname.trim())
      saveUser(data)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = (account) => {
    localStorage.setItem('carbon_token', account.token)
    saveUser({ phone: '', nickname: account.nickname, points: 0, is_demo: true })
    navigate('/home', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* 背景光斑 */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-500/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-brand-400/20 blur-3xl" />

      <div className="w-full max-w-md relative">
        {/* 品牌区 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-white shadow-brand">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21c-4 0-7-2-8.5-5.5C2 11 4 7 7 5.5c.6-.3 1.1-.5 1.5-.7C9 3 11 2 12 2c1 0 3 1 3.5 2.8.4.2.9.4 1.5.7C20 7 22 11 20.5 15.5 19 19 16 21 12 21z" fill="#358c55"/>
              <path d="M12 18c-1 0-2-.8-2-2 0-1.2 1.5-2.5 2-3 .5.5 2 1.8 2 3 0 1.2-1 2-2 2z" fill="#0b2015"/>
            </svg>
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white">碳衡物语</h1>
          <p className="mt-2 text-sm text-brand-100">
            记碳 · 算碳 · 养成你的绿色世界
          </p>
        </div>

        {/* 登录卡片 */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-[16px] shadow-brand p-6 space-y-4"
        >
          <h2 className="font-semibold text-ink-900">开启你的减碳之旅</h2>

          <div className="space-y-1.5">
            <label className="block text-sm text-ink-600">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11 位手机号"
              className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm text-ink-600">昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="想让大家怎么称呼你？"
              maxLength={32}
              className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-[12px] px-3 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-[12px] bg-brand-600 text-white py-3 font-semibold hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '正在进入…' : ready ? '开始减碳之旅' : '设备初始化中…'}
          </button>

          {/* 演示账号 */}
          <div className="pt-2 border-t border-line">
            <p className="text-xs text-ink-400 mt-3 mb-2">演示账号（路演一键登顶）</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.token}
                  type="button"
                  onClick={() => handleDemo(a)}
                  className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 active:scale-[0.97] transition"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-[11px] text-brand-200/70">
          清华绿色创新挑战赛 · 方案 B · 个人碳账本
        </p>
      </div>
    </div>
  )
}
