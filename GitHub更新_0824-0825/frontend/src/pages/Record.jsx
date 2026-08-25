// 记碳 Tab：真实表单 + 拍照 OCR → 算碳 → 积分（Phase 2 已打通后端）
import { useRef, useState } from 'react'
import { recordCarbon, uploadCarbon } from '../api/carbon'
import { getUser, saveUser } from '../store/user'

// 图片压缩：最大边 1280px、JPEG、尽量 <1.5MB（上传友好，OCR 识别够用）
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1280
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        let quality = 0.8
        let dataUrl = canvas.toDataURL('image/jpeg', quality)
        while (dataUrl.length > 1_500_000 && quality > 0.4) {
          quality -= 0.15
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(dataUrl.split(',')[1]) // 去掉 data:image/jpeg;base64, 前缀
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })

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

  // ---- 拍照 OCR ----
  const [ocrImage, setOcrImage] = useState(null) // { dataUrl, base64 }
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const camInputRef = useRef(null)
  const galInputRef = useRef(null)

  const handleOcrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重选同一张
    if (!file) return
    setOcrError('')
    try {
      const base64 = await compressImage(file)
      setOcrImage({ dataUrl: 'data:image/jpeg;base64,' + base64, base64 })
    } catch (err) {
      setOcrError(err.message || '图片读取失败，请换一张')
    }
  }

  const handleOcrUpload = async () => {
    if (!ocrImage) return
    setOcrLoading(true)
    setOcrError('')
    try {
      const data = await uploadCarbon(ocrImage.base64)
      setResult(data)
      const user = getUser()
      if (user) saveUser({ ...user, points: data.points_balance })
      setOcrImage(null)
    } catch (err) {
      setOcrError(err.message)
    } finally {
      setOcrLoading(false)
    }
  }

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

      {/* 拍照识别（OCR：小票/账单 → 自动算碳） */}
      <div className="bg-card rounded-[16px] border border-line shadow-soft p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-800">拍照识别小票 / 账单</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">OCR</span>
        </div>
        <input ref={camInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrFile} />
        <input ref={galInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrFile} />

        {ocrImage ? (
          <div className="flex items-center gap-3">
            <img src={ocrImage.dataUrl} alt="识别预览" className="w-16 h-16 rounded-[10px] object-cover border border-line" />
            <div className="flex-1 space-y-1.5">
              {ocrError && <p className="text-xs text-red-600 bg-red-50 rounded-[10px] px-3 py-2">{ocrError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleOcrUpload}
                  disabled={ocrLoading}
                  className="flex-1 rounded-[10px] bg-brand-600 text-white py-2.5 text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 transition"
                >
                  {ocrLoading ? '识别中…（约 3-15 秒）' : '开始识别'}
                </button>
                <button
                  onClick={() => setOcrImage(null)}
                  disabled={ocrLoading}
                  className="px-4 rounded-[10px] bg-surface text-ink-600 text-sm font-medium disabled:opacity-50 transition"
                >
                  重选
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => camInputRef.current?.click()}
              className="flex flex-col items-center gap-1 py-3 rounded-[12px] bg-surface border border-line text-ink-700 hover:bg-brand-50 transition"
            >
              <span className="text-xl">📷</span>
              <span className="text-xs">拍照</span>
            </button>
            <button
              onClick={() => galInputRef.current?.click()}
              className="flex flex-col items-center gap-1 py-3 rounded-[12px] bg-surface border border-line text-ink-700 hover:bg-brand-50 transition"
            >
              <span className="text-xl">🖼️</span>
              <span className="text-xs">从相册选择</span>
            </button>
          </div>
        )}
        <p className="text-[10px] text-ink-400 leading-relaxed">
          拍一张小票/账单，AI 识别活动与金额后自动记碳。识别失败可退回下方手动记账。
        </p>
      </div>

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
