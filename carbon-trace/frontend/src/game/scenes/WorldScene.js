// 泰拉瑞亚风 2D 开放世界场景（诊断版）
// - 摄像机：update 里直接 scrollX = player.x - 屏宽/2（最直接的居中跟随）
// - HUD 醒目显示「角色x / 镜头x」，验证跟随
import Phaser from 'phaser'

const TILE = 40

const CHARACTERS = {
  1: { key: 'forest', name: '森林精灵', body: 0x3f9b4f, accent: 0x1e6b34 },
  2: { key: 'ocean', name: '海洋之心', body: 0x3b82f6, accent: 0x1e40af },
  3: { key: 'sky', name: '天空旅者', body: 0x7dd3fc, accent: 0x0284c7 },
  4: { key: 'earth', name: '大地行者', body: 0xd98e1a, accent: 0x92400e },
}

function surfaceYAt(i) {
  let y = 760
  y += Math.sin(i * 0.13) * 150
  y += Math.sin(i * 0.31) * 60
  y += Math.sin(i * 0.7) * 22
  return Math.floor(y / TILE) * TILE
}

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
    this.characterId = 1
    this.frame = 0
  }

  init() {
    const cid = parseInt(localStorage.getItem('carbon_character_id') || '1', 10)
    this.characterId = CHARACTERS[cid] ? cid : 1
  }

  create() {
    this.WORLD_W = 4800
    this.WORLD_H = 1400

    this.cameras.main.setBackgroundColor('#8ec9e8')

    try {
      this.createTerrain()
      this.createPlayer()
    } catch (e) {
      console.error('[WorldScene] 初始化失败:', e)
      this.add.text(20, 60, '错误: ' + e.message, {
        fontFamily: 'monospace', fontSize: '16px', color: '#fff', backgroundColor: '#c00', padding: { x: 10, y: 6 },
      }).setScrollFactor(0).setDepth(300)
      return
    }

    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H)
    this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    // A/D 键控制左右（电脑端）
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    // 虚拟输入（手机端摇杆，由 React 触摸按钮写入）
    this.virtualInput = { left: false, right: false, jump: false }
    window.__carbonVirtualInput = this.virtualInput

    // HUD：醒目大字
    this.hudText = this.add
      .text(16, 16, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#000000',
        backgroundColor: '#ffff00',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
  }

  createTerrain() {
    this.grounds = []
    const cols = Math.ceil(this.WORLD_W / TILE)
    for (let i = 0; i < cols; i++) {
      const x = i * TILE + TILE / 2
      const surfaceY = surfaceYAt(i)
      for (let d = 0; d < 5; d++) {
        const y = surfaceY + d * TILE + TILE / 2
        const color = d === 0 ? 0x4a9c3f : 0x8a5a33
        const rect = this.add.rectangle(x, y, TILE, TILE, color)
        this.physics.add.existing(rect, true)
        this.grounds.push(rect)
      }
    }
  }

  createPlayer() {
    const char = CHARACTERS[this.characterId]
    const spawnY = surfaceYAt(5) - 100

    this.player = this.add.rectangle(200, spawnY, 22, 34, char.body)
    this.physics.add.existing(this.player, false)
    this.player.body.setCollideWorldBounds(true)

    this.head = this.add.rectangle(200, spawnY - 25, 16, 16, 0xf2c79b)
    this.hair = this.add.rectangle(200, spawnY - 33, 18, 6, char.accent)

    this.physics.add.collider(this.player, this.grounds)
  }

  update() {
    if (!this.player) return
    const speed = 240
    const left = this.cursors.left.isDown || this.keyA.isDown || this.virtualInput.left
    const right = this.cursors.right.isDown || this.keyD.isDown || this.virtualInput.right

    this.player.body.setVelocityX(0)
    if (left) {
      this.player.body.setVelocityX(-speed)
    } else if (right) {
      this.player.body.setVelocityX(speed)
    }

    const onGround = this.player.body.blocked.down || this.player.body.touching.down
    if ((Phaser.Input.Keyboard.JustDown(this.jumpKey) || this.virtualInput.jump) && onGround) {
      this.player.body.setVelocityY(-520)
      this.virtualInput.jump = false // 虚拟跳跃一次性触发
    }

    // 头部跟随
    this.head.x = this.player.x
    this.head.y = this.player.y - 25
    this.hair.x = this.player.x
    this.hair.y = this.player.y - 33

    // ★ 摄像机直接居中玩家（最直接的方式）
    const cam = this.cameras.main
    cam.scrollX = this.player.x - cam.width / 2
    cam.scrollY = this.player.y - cam.height / 2

    // HUD：角色坐标 vs 镜头坐标（两者应该一起变）
    if (this.hudText) {
      this.hudText.setText(
        `角色x:${Math.round(this.player.x)} 镜头x:${Math.round(cam.scrollX)}`
      )
    }

    // 每 30 帧打印一次到 console，方便 F12 查看
    this.frame++
    if (this.frame % 30 === 0) {
      console.log(`[World] 角色x=${Math.round(this.player.x)} 镜头x=${Math.round(cam.scrollX)}`)
    }
  }
}
