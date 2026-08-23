// 启动动画：品牌 splash，约 2.2 秒后淡出
import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2000)
    const t2 = setTimeout(() => onDone?.(), 2600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 光斑背景 */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-brand-400/20 blur-3xl" />

      {/* 品牌叶子 logo */}
      <div
        className="w-24 h-24 rounded-[28px] bg-white/95 shadow-brand flex items-center justify-center"
        style={{ animation: 'splash-leaf 0.9s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21c-4 0-7-2-8.5-5.5C2 11 4 7 7 5.5c.6-.3 1.1-.5 1.5-.7C9 3 11 2 12 2c1 0 3 1 3.5 2.8.4.2.9.4 1.5.7C20 7 22 11 20.5 15.5 19 19 16 21 12 21z" fill="#358c55"/>
          <path d="M12 18c-1 0-2-.8-2-2 0-1.2 1.5-2.5 2-3 .5.5 2 1.8 2 3 0 1.2-1 2-2 2z" fill="#0b2015"/>
        </svg>
      </div>

      {/* 字标 + slogan */}
      <div style={{ animation: 'splash-rise 0.8s 0.25s cubic-bezier(0.22,1,0.36,1) both' }}>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white text-center">碳迹</h1>
        <p className="mt-2 text-sm text-brand-100 text-center">
          记碳 · 算碳 · 养成你的绿色世界
        </p>
      </div>

      {/* 加载条 */}
      <div className="mt-8 w-40 h-1 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-white"
          style={{ animation: 'splash-bar 1.8s cubic-bezier(0.3,0,0.2,1) both' }}
        />
      </div>
    </div>
  )
}
