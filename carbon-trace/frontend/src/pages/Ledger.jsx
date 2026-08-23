// 碳账本页：记录列表 + 分类占比（Phase 2 已打通后端）
import { useEffect, useState } from 'react'
import { fetchCarbonList, fetchCarbonStats } from '../api/carbon'

const CATEGORY_META = {
  transport: { label: '交通', icon: '🚌', color: 'bg-brand-500' },
  electricity: { label: '用电', icon: '💡', color: 'bg-solar-500' },
  food: { label: '饮食', icon: '🍚', color: 'bg-forest-500' },
  consumption: { label: '消费', icon: '🛍️', color: 'bg-sky-500' },
}

export default function Ledger() {
  const [stats, setStats] = useState(null)
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([fetchCarbonStats(), fetchCarbonList(1, 50)])
      .then(([s, l]) => {
        if (!alive) return
        setStats(s)
        setRecords(l.items || [])
        setTotal(l.total || 0)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const maxKg = stats ? Math.max(0.01, ...Object.values(stats).filter((v) => typeof v === 'number' && v > 0)) : 0

  return (
    <div className="min-h-[100dvh] bg-surface pb-10">
      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">
        <h1 className="text-xl font-bold text-ink-900 tracking-tight">碳账本</h1>
        {loading ? (
          <p className="text-sm text-ink-400 text-center py-10">加载中…</p>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 rounded-[12px] px-4 py-3">{error}</p>
        ) : (
          <>
            {/* 总碳足迹 */}
            <div className="rounded-[16px] bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 shadow-brand">
              <p className="text-sm text-brand-100">累计碳足迹</p>
              <p className="mt-1 text-4xl font-bold tracking-tight">
                {stats?.total_kg ?? 0}<span className="text-lg font-medium text-brand-200"> kgCO₂</span>
              </p>
              <p className="mt-2 text-xs text-brand-200">共 {total} 笔记录</p>
            </div>

            {/* 分类占比 */}
            <div className="bg-card rounded-[16px] border border-line shadow-soft p-4 space-y-3">
              <p className="text-sm font-semibold text-ink-900">分类占比</p>
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const v = stats?.[key] || 0
                const pct = stats?.total_kg ? Math.round((v / stats.total_kg) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink-600">{meta.icon} {meta.label}</span>
                      <span className="text-ink-400">{v} kg · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.color}`}
                        style={{ width: `${Math.min(100, (v / maxKg) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 记录列表 */}
            <div className="bg-card rounded-[16px] border border-line shadow-soft divide-y divide-line overflow-hidden">
              <p className="px-4 py-3 text-sm font-semibold text-ink-900">记录明细</p>
              {records.length === 0 ? (
                <p className="px-4 py-8 text-sm text-ink-400 text-center">还没有记录，去记一笔吧～</p>
              ) : (
                records.map((r) => {
                  const meta = CATEGORY_META[r.category] || { icon: '📝', label: r.category }
                  return (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{meta.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-ink-900">{r.activity}</p>
                          <p className="text-xs text-ink-400">
                            {r.value} {r.unit} · {meta.label}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-forest-700">{r.co2_kg} kg</p>
                        <p className="text-[10px] text-ink-400">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
