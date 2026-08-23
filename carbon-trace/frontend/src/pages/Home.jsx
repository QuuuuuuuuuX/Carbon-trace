// 首页 Tab：概览 + 快捷入口
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser } from '../store/user'

export default function Home() {
  const user = getUser()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')

  const quickActions = [
    { icon: '🐦', title: '我的角色', desc: '4 选 1 + AI 设定', to: '/character' },
    { icon: '📊', title: '碳账本', desc: '记录 + 分类占比', to: '/ledger' },
  ]

  const handle = (a) => {
    if (a.to) navigate(a.to)
    else setNotice(`「${a.title}」Phase 2 联调后开放（后端 8/25 起实现）`)
    if (a.soon) setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
      {/* 顶部：昵称 + 积分 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-400">欢迎回来</p>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">{user?.nickname || '玩家'}</h1>
        </div>
        <span className="bg-solar-50 text-solar-700 border border-solar-200 rounded-full px-3 py-1.5 text-sm font-semibold">
          ⚡ {user?.points ?? 0}
        </span>
      </div>

      {/* 今日碳足迹大卡片 */}
      <div className="rounded-[16px] bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 shadow-brand">
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-100">今日碳足迹</p>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-brand-50">实时</span>
        </div>
        <p className="mt-3 text-4xl font-bold tracking-tight">
          0<span className="text-lg font-medium text-brand-200"> kgCO₂</span>
        </p>
        <p className="mt-3 text-xs text-brand-200/90 leading-relaxed">
          记碳 → 算碳 → 得积分，Phase 2 联调后展示真实数据
        </p>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((a) => (
          <button
            key={a.title}
            onClick={() => handle(a)}
            className="text-left bg-card rounded-[16px] p-4 border border-line shadow-soft transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] bg-brand-50 text-xl">
              {a.icon}
            </span>
            <p className="mt-2.5 font-semibold text-ink-900 flex items-center gap-1.5">
              {a.title}
              {a.soon && (
                <span className="text-[10px] text-solar-700 bg-solar-50 border border-solar-200 rounded-full px-1.5 py-0.5">
                  待开放
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* 提示 */}
      {notice && (
        <p className="text-xs text-solar-700 bg-solar-50 border border-solar-200 rounded-[12px] px-4 py-3">
          {notice}
        </p>
      )}

      {/* 一句话激励 */}
      <div className="rounded-[16px] bg-forest-50 border border-forest-100 p-4">
        <p className="text-sm text-forest-700">
          🌱 每一次低碳选择，都在让世界更绿一点
        </p>
      </div>
    </div>
  )
}
