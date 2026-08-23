// 记碳 Tab：真实表单 → 算碳 → 积分（Phase 2 已打通后端）
import { useState } from 'react'
import { recordCarbon } from '../api/carbon'
import { getUser, saveUser } from '../store/user'

// 活动选项（与后端 emission_factors.json 对应）
const CATEGORIES = [
  { key: 'transport', label: '交通', icon: '🚌', unit: 'km', activities: [
    { name: '打车' }, { name: '地铁' }, { name: '公交' }, { name: '步行' },
    { name: '骑行' }, { name: '高铁' }, { name: '飞机' },
  ] },
  { key: 'electricity', label: '用电', icon: '💡', unit: '度', activities: [
    { name: '用电' },
  ] },
  { key: 'food', label: '饮食', icon: '🍚', unit: '份', activities: [
    { name: '牛肉饭' }, { name: '猪肉饭' }, { name: '鸡肉饭' }, { name: '素食' },
  ] },
  { key: 'consumption', label: '消费', icon: '🛍️', unit: '单', activities: [
    { name: '外卖' },
  ] },
]

export default function Record() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [activity, setActivity] = useState(CATEGORIES[0].activities[0].name)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const cat = CATEGORIES.find((c) => c.key === category.key) || CATEGORIES[0]

  const switchCategory = (c) => {
    setCategory(c)
    setActivity(c.activities[0].name)
    setValue('')
    setError('')
  }

  const handleSubmit = async () => {
    setError('')
    const v = parseFloat(value)
    if (!v || v <= 0) return setError('请输入大于 0 的数值')
    setLoading(true)
    try {
      const data = await recordCarbon({
        category: cat.key,
        activity,
        value: v,
        unit: cat.unit,
      })
      setResult(data)
      // 更新本地积分
      const user = getUser()
      if (user) saveUser({ ...user, points: data.points_balance })
      setValue('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
      <h1 className="text-xl font-bold text-ink-900 tracking-tight">记碳</h1>
      <p className="text-sm text-ink-600">记录今天的一次活动，AI 帮你换算成碳排放</p>

      {/* 分类 Tab */}
      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => switchCategory(c)}
            className={`flex flex-col items-center gap-0.5 py-2.5 rounded-[12px] border transition ${
              category.key === c.key
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-card border-line text-ink-600'
            }`}
          >
            <span className="text-lg">{c.icon}</span>
            <span className="text-xs">{c.label}</span>
          </button>
        ))}
      </div>

      {/* 活动选择 */}
      <div className="bg-card rounded-[16px] border border-line shadow-soft p-4 space-y-3">
        <p className="text-xs text-ink-400">选择活动</p>
        <div className="flex flex-wrap gap-2">
          {cat.activities.map((a) => (
            <button
              key={a.name}
              onClick={() => { setActivity(a.name); setError('') }}
              className={`px-3.5 py-2 rounded-full text-sm transition ${
                activity === a.name
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-ink-600 hover:bg-brand-50'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>

        {/* 数值输入 */}
        <div className="pt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`输入数值`}
            className="flex-1 rounded-[12px] border border-line bg-white px-4 py-3 text-lg text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
          <span className="text-ink-600 font-medium">{cat.unit}</span>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-[12px] px-3 py-2.5">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-[12px] bg-brand-600 text-white py-3 font-semibold hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 transition"
        >
          {loading ? '计算中…' : '记下这笔'}
        </button>
      </div>

      {/* 结果展示 */}
      {result && (
        <div className="rounded-[16px] bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 shadow-brand space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-100">本次碳排放</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/15">已记账</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {result.co2_kg}<span className="text-lg font-medium text-brand-200"> kgCO₂</span>
          </p>
          <div className="bg-white/10 rounded-[12px] px-4 py-3">
            <p className="text-sm">
              ⚡ 获得 <span className="font-bold text-solar-300">+{result.points_earned}</span> 积分
              <span className="text-brand-200">（余额 {result.points_balance}）</span>
            </p>
            <p className="mt-1 text-xs text-brand-200">
              连续打卡 {result.streak_days} 天 · 固定+{result.points_detail.fixed} 减排+{result.points_detail.ratio} 分类+{result.points_detail.type} 打卡+{result.points_detail.streak}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
