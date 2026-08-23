// 我的 Tab：个人信息 + 角色入口 + 设置
import { useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../store/user'
import { clearDeviceToken } from '../api/client'

export default function Profile() {
  const user = getUser()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearUser()
    clearDeviceToken()
    navigate('/', { replace: true })
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
      {/* 个人信息卡 */}
      <div className="rounded-[16px] bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 shadow-brand">
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            👤
          </span>
          <div>
            <p className="font-bold text-lg tracking-tight">{user?.nickname || '玩家'}</p>
            <p className="text-xs text-brand-200 mt-0.5">
              {user?.is_demo ? '演示账号' : user?.phone || '未绑定手机号'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between bg-white/10 rounded-[12px] px-4 py-3">
          <span className="text-sm text-brand-100">我的积分</span>
          <span className="font-semibold text-solar-300">⚡ {user?.points ?? 0}</span>
        </div>
      </div>

      {/* 菜单 */}
      <div className="bg-card rounded-[16px] border border-line shadow-soft divide-y divide-line overflow-hidden">
        <button
          onClick={() => navigate('/character')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-brand-50 transition"
        >
          <span className="flex items-center gap-2.5 text-sm text-ink-900">
            <span className="text-lg">🐦</span> 我的角色
          </span>
          <span className="text-ink-400">›</span>
        </button>
        <div className="w-full flex items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-2.5 text-sm text-ink-900">
            <span className="text-lg">📊</span> 我的碳账本
          </span>
          <span className="text-[11px] text-solar-700 bg-solar-50 border border-solar-200 rounded-full px-1.5 py-0.5">
            待开放
          </span>
        </div>
        <div className="w-full flex items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-2.5 text-sm text-ink-900">
            <span className="text-lg">⚙️</span> 设置
          </span>
          <span className="text-ink-400">›</span>
        </div>
      </div>

      {/* 退出 */}
      <button
        onClick={handleLogout}
        className="w-full rounded-[16px] bg-card border border-line shadow-soft py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
      >
        退出登录
      </button>

      <p className="text-center text-[11px] text-ink-400 pt-2">
        碳迹 · 清华绿色创新挑战赛 · 方案 B
      </p>
    </div>
  )
}
