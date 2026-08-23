// 角色选择页：接真实接口（Phase 2 已打通后端，LLM fallback 已处理）
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCharacterOptions, chooseCharacter, fetchMyCharacter } from '../api/character'

// 角色配色 + 表情（按 id 1-4）
const STYLES = [
  { emoji: '🌳', bg: 'from-forest-400 to-forest-600' },
  { emoji: '🐬', bg: 'from-sky-400 to-sky-600' },
  { emoji: '🕊️', bg: 'from-violet-400 to-violet-600' },
  { emoji: '⛰️', bg: 'from-solar-300 to-solar-500' },
]

// 本地兜底（后端 options 不可用时）
const FALLBACK_OPTIONS = [
  { id: 1, name: '森林精灵', description: '守护森林的低语者，温和而坚定' },
  { id: 2, name: '海洋之心', description: '深蓝之子，胸怀如海' },
  { id: 3, name: '天空旅者', description: '云端漫步者，向往自由' },
  { id: 4, name: '大地行者', description: '脚踏实地，承载万物' },
]

export default function Character() {
  const navigate = useNavigate()
  const [options, setOptions] = useState(FALLBACK_OPTIONS)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chosen, setChosen] = useState(null)

  // 加载角色列表 + 已选角色
  useEffect(() => {
    let alive = true
    fetchCharacterOptions()
      .then((d) => {
        if (alive && d.items && d.items.length) setOptions(d.items)
      })
      .catch(() => { /* 后端不可用用本地兜底 */ })
    fetchMyCharacter()
      .then((d) => {
        if (alive && d.has_character) {
          setSelected({ id: d.character_id })
          setChosen(d)
          localStorage.setItem('carbon_character_id', String(d.character_id))
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const data = await chooseCharacter(selected.id)
      setChosen(data)
      localStorage.setItem('carbon_character_id', String(selected.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-surface pb-10">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-line">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/profile" className="text-brand-600 text-sm font-medium hover:text-brand-700">← 返回</Link>
          <span className="font-bold text-ink-900 tracking-tight">选择你的碳伙伴</span>
          <span className="w-10" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-4">
        <p className="text-sm text-ink-600 text-center">
          选一位伙伴，AI 会为 TA 生成专属设定与减排建议
        </p>

        {/* 角色卡片 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((c, i) => {
            const active = selected?.id === c.id
            const style = STYLES[(c.id - 1) % STYLES.length] || STYLES[i % STYLES.length]
            return (
              <button
                key={c.id}
                onClick={() => setSelected({ id: c.id })}
                className={`relative text-left bg-card rounded-[16px] p-4 border-2 shadow-soft transition active:scale-[0.98] ${
                  active
                    ? 'border-brand-500 ring-2 ring-brand-200'
                    : 'border-transparent hover:border-brand-200'
                }`}
              >
                <div className={`w-14 h-14 rounded-[14px] bg-gradient-to-br ${style.bg} flex items-center justify-center text-white text-2xl shadow-soft`}>
                  {style.emoji}
                </div>
                <p className="mt-3 font-semibold text-ink-900">{c.name}</p>
                <p className="mt-0.5 text-xs text-ink-400 leading-relaxed">{c.description}</p>
                {active && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <p className="text-xs text-solar-700 bg-solar-50 border border-solar-200 rounded-[12px] px-4 py-3">{error}</p>
        )}

        {/* 确认选择 */}
        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="w-full rounded-[12px] bg-brand-600 text-white py-3 font-semibold hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? '正在生成设定…' : '确认选择'}
        </button>

        {/* 已选角色展示 */}
        {chosen && (
          <div className="bg-card rounded-[16px] p-6 shadow-soft border border-line">
            <p className="text-xs text-ink-400">我的碳伙伴</p>
            <p className="mt-1 text-2xl font-bold text-ink-900 tracking-tight">{chosen.ai_name}</p>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">{chosen.ai_personality}</p>
            {chosen.ai_advice && (
              <p className="mt-3 text-xs text-forest-700 bg-forest-50 rounded-[12px] px-3 py-2.5">
                💡 {chosen.ai_advice}
              </p>
            )}
            <button
              onClick={() => navigate('/world')}
              className="mt-4 w-full rounded-[12px] bg-brand-100 text-brand-800 py-2.5 text-sm font-semibold hover:bg-brand-200 active:scale-[0.98] transition"
            >
              带 TA 去世界看看 →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
