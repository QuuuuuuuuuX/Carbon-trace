// 世界 Tab：Phaser 2D 世界挂载 + 虚拟摇杆（手机端 GameBoy 风）
import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import WorldScene from '../game/scenes/WorldScene'
import WorldClient from '../game/net/worldClient'

export default function World() {
  const gameRef = useRef(null)
  const wsRef = useRef(null)
  const [wsStatus, setWsStatus] = useState('未连接')

  // 启动 Phaser（parent 用 id 字符串，和之前能跑的 TestScene 一致）
  useEffect(() => {
    if (gameRef.current) return
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'world-mount',
      width: 960,
      height: 540,
      physics: { default: 'arcade', arcade: { gravity: { y: 900 } } },
      scene: [WorldScene],
      pixelArt: true,
      backgroundColor: '#8ec9e8',
    })
    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  // WS 连接（Phase 3 协议骨架：identify → 位置同步 → 心跳 → 离开）
  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const client = new WorldClient({
      url: `${proto}://${location.host}/ws/world`,
      onStatus: setWsStatus,
      onMessage: (msg) => {
        if (msg.type === 'players') setWsStatus(`在线 ${msg.players?.length ?? 0} 人`)
      },
    })
    wsRef.current = client
    client.connect()
    return () => {
      client.destroy()
      wsRef.current = null
    }
  }, [])

  // 把 WorldClient 暴露给 WorldScene 用（多人同步）
  useEffect(() => {
    window.__carbonWorldClient = wsRef.current
    return () => {
      delete window.__carbonWorldClient
    }
  }, [])

  // 写虚拟输入（WorldScene 暴露的 window.__carbonVirtualInput）
  const setVirtual = (patch) => {
    const vi = window.__carbonVirtualInput
    if (vi) Object.assign(vi, patch)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900 tracking-tight">碳衡世界</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
          WS {wsStatus}
        </span>
      </div>

      {/* 画布容器（relative，叠加虚拟摇杆） */}
      <div className="relative">
        <div
          id="world-mount"
          className="rounded-[16px] overflow-hidden border-4 border-brand-200 shadow-soft"
          style={{ width: '100%', maxWidth: 960 }}
        />

        {/* 虚拟摇杆（GameBoy 风：左 D-pad 左右移动，右 A 跳跃） */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between items-end px-4 pointer-events-none select-none">
          {/* 左：D-pad ◀ ▶ */}
          <div className="flex gap-3 pointer-events-auto">
            <button
              className="w-14 h-14 rounded-full bg-black/35 text-white text-xl font-bold flex items-center justify-center active:bg-brand-600 transition-colors backdrop-blur-sm"
              onTouchStart={(e) => { e.preventDefault(); setVirtual({ left: true }) }}
              onTouchEnd={(e) => { e.preventDefault(); setVirtual({ left: false }) }}
              onMouseDown={() => setVirtual({ left: true })}
              onMouseUp={() => setVirtual({ left: false })}
              onMouseLeave={() => setVirtual({ left: false })}
            >
              ◀
            </button>
            <button
              className="w-14 h-14 rounded-full bg-black/35 text-white text-xl font-bold flex items-center justify-center active:bg-brand-600 transition-colors backdrop-blur-sm"
              onTouchStart={(e) => { e.preventDefault(); setVirtual({ right: true }) }}
              onTouchEnd={(e) => { e.preventDefault(); setVirtual({ right: false }) }}
              onMouseDown={() => setVirtual({ right: true })}
              onMouseUp={() => setVirtual({ right: false })}
              onMouseLeave={() => setVirtual({ right: false })}
            >
              ▶
            </button>
          </div>

          {/* 右：跳跃按钮 A */}
          <button
            className="w-16 h-16 rounded-full bg-brand-600/90 text-white text-lg font-bold flex items-center justify-center active:bg-brand-800 transition-colors shadow-brand backdrop-blur-sm"
            onTouchStart={(e) => { e.preventDefault(); setVirtual({ jump: true }) }}
            onMouseDown={() => setVirtual({ jump: true })}
          >
            A
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-ink-400">
        电脑：A/D 移动 · 空格跳跃 · 手机：虚拟摇杆（◀▶ 移动，A 跳跃）
      </p>
    </div>
  )
}
