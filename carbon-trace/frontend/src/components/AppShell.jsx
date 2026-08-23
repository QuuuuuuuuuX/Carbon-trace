// App 外壳：底部 Tab 导航（参考 SURF 移动优先 App 结构）
// 5 槽位，「记碳」作为正中央凸起的大按钮（参考 surfplus 的 compose 按钮）
import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/home', key: 'home', icon: '🏠', label: '首页' },
  { to: '/ledger', key: 'ledger', icon: '📊', label: '碳账本' },
  { to: '/record', key: 'record', icon: '🍃', label: '记碳', center: true },
  { to: '/world', key: 'world', icon: '🌍', label: '世界' },
  { to: '/profile', key: 'profile', icon: '👤', label: '我的' },
]

export default function AppShell() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface">
      {/* 内容区 */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* 底部 Tab 栏（5 槽位，记碳居中） */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex items-end">
          {TABS.map((t) => {
            // 中央大按钮（记碳）
            if (t.center) {
              return (
                <NavLink
                  key={t.key}
                  to={t.to}
                  className="flex-1 flex flex-col items-center -mt-7"
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-brand transition-transform ${
                          isActive
                            ? 'bg-brand-700 scale-105'
                            : 'bg-brand-600 hover:bg-brand-700'
                        }`}
                      >
                        {t.icon}
                      </span>
                      <span
                        className={`text-[11px] mt-1 transition-colors ${
                          isActive ? 'text-brand-700 font-semibold' : 'text-ink-400'
                        }`}
                      >
                        {t.label}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            }

            // 普通 tab
            return (
              <NavLink
                key={t.key}
                to={t.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                    isActive ? 'text-brand-700 font-semibold' : 'text-ink-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`text-xl leading-none transition-transform ${
                        isActive ? 'scale-110' : ''
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                    {isActive && <span className="w-1 h-1 rounded-full bg-brand-700" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
