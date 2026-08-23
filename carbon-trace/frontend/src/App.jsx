// 应用入口：启动动画 + 路由 + 鉴权守卫
import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getDeviceToken, clearDeviceToken } from './api/client'
import { clearUser } from './store/user'
import SplashScreen from './components/SplashScreen'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Home from './pages/Home'
import Record from './pages/Record'
import World from './pages/World'
import Profile from './pages/Profile'
import Character from './pages/Character'
import Ledger from './pages/Ledger'

// 简易守卫：没有设备 token 就回登录页
function RequireAuth({ children }) {
  const token = getDeviceToken()
  if (!token) return <Navigate to="/" replace />
  return children
}

// 每次整页加载都重置登录状态 → 每次打开都从「开屏动画 → 登录界面」开始
clearUser()
clearDeviceToken()

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <HashRouter>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <Routes>
        <Route path="/" element={<Login />} />

        {/* 带底部 Tab 的主界面 */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/record" element={<Record />} />
          <Route path="/world" element={<World />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* 子页面（无 Tab，自带返回） */}
        <Route
          path="/character"
          element={
            <RequireAuth>
              <Character />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
