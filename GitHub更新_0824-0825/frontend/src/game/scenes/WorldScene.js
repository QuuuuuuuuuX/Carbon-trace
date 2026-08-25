// 泰拉瑞亚风 2D 开放世界场景（像素风 v0.5）
// 升级点（参考泰拉瑞亚视觉风格，2026-08-24）:
//  1. 像素纹理: 全部用 textures.createCanvas + 像素级绘制（草块/泥土/石头/角色/树/云/山/日/月）
//  2. 多群系: 世界水平分 3 区 —— 森林(绿草+橡树) / 沙漠(金沙+仙人掌) / 雪原(白雪+雪松)
//  3. 昼夜动态: ~100s 循环，天空渐变 + 星空 + 夜晚氛围罩 + 太阳/月亮
//  4. 地下层: 泥土 → 石头，石头随机荧光矿脉点
// 保留: 摄像机居中跟随 / A/D+方向键+空格 / 手机虚拟摇杆 / HUD 调试
import Phaser from 'phaser'

const TILE = 40    // 一个方块 40px（方块纹理 20x20 @2）
const PX = 2       // 像素块尺寸（装饰/角色纹理统一 2px 一块）

// ---------- 工具 ----------
function hexToRgb(h) {
  return { r: (h >> 16) & 255, g: (h >> 8) & 255, b: h & 255 }
}
function rgbToHex(r, g, b) {
  return ((r << 16) | (g << 8) | b) >>> 0
}
function shade(hex, f) {
  const c = hexToRgb(hex)
  return rgbToHex(Math.min(255, Math.round(c.r * f)), Math.min(255, Math.round(c.g * f)), Math.min(255, Math.round(c.b * f)))
}
function mixHex(h1, h2, f) {
  const a = hexToRgb(h1), b = hexToRgb(h2)
  return rgbToHex(
    Math.round(a.r + (b.r - a.r) * f),
    Math.round(a.g + (b.g - a.g) * f),
    Math.round(a.b + (b.b - a.b) * f)
  )
}
function hexStr(h) { return '#' + h.toString(16).padStart(6, '0') }
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// 世界坐标哈希（确定性噪点 → 地形跨方块完全连续）
function hash2(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263
  n = (n ^ (n >> 13)) * 1274126177
  return ((n ^ (n >> 16)) >>> 0) / 4294967296
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// 地表高度（多层正弦叠加 + 相邻列差 ≤ 40px 平滑 → 行/列都连续，无断崖断层）
const SURFACE = []
function buildSurface() {
  const cols = Math.ceil(4800 / TILE)
  let cur = 0
  for (let i = 0; i < cols; i++) {
    let y = 760
    y += Math.sin(i * 0.13) * 150
    y += Math.sin(i * 0.31) * 60
    y += Math.sin(i * 0.7) * 22
    y = Math.floor(y / TILE) * TILE
    if (i > 0) {
      if (y > cur + TILE) y = cur + TILE      // 上坡限速：一次最多升一格
      else if (y < cur - TILE) y = cur - TILE // 下坡限速：一次最多降一格
    }
    cur = y
    SURFACE.push(y)
  }
}
function surfaceYAt(i) {
  if (SURFACE.length === 0) buildSurface()
  return SURFACE[Math.max(0, Math.min(SURFACE.length - 1, i))]
}

// ---------- 群系（水平分区） ----------
const BIOMES = [
  { // 森林 0-1600
    name: '森林',
    from: 0, to: 1600,
    grass: 0x4a9c3f, grassLight: 0x5fb54f, dirt: 0x8a5a33,
    skyDay: 0x8ec9e8, skyNight: 0x141438,
    mountainFar: 0x9fc4a8, mountainNear: 0x5f8f6e,
    tree: 'tree_oak',
  },
  { // 沙漠 1600-3200（整层沙）
    name: '沙漠',
    from: 1600, to: 3200,
    grass: 0xe0c068, grassLight: 0xf0d58a, dirt: 0xc9a05c,
    skyDay: 0xf2d9a0, skyNight: 0x1a1733,
    mountainFar: 0xc9b98a, mountainNear: 0x9c8a5f,
    tree: 'tree_cactus',
  },
  { // 雪原 3200-4800
    name: '雪原',
    from: 3200, to: 4800,
    grass: 0xf0f6ff, grassLight: 0xffffff, dirt: 0x8a5a33,
    skyDay: 0xcfe4f5, skyNight: 0x101c38,
    mountainFar: 0xbcd6e8, mountainNear: 0x8fb4cf,
    tree: 'tree_pine',
  },
]
function biomeAt(x) {
  for (const b of BIOMES) if (x >= b.from && x < b.to) return b
  return BIOMES[0]
}

// ---------- 角色（4 固定外观，像素模板 12x16 块 @2 = 24x32px） ----------
const PLAYER_SHAPE = [
  '....HHHH....',
  '...HHHHHH...',
  '...HHHHHH...',
  '...HSSSSH...',
  '...HSxxSH...',
  '....SSSS....',
  '...SSSSSS...',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '..BBBBBBBB..',
  '..BBSSSSBB..',
  '...PPPPPP...',
  '...PP..PP...',
  '...PP..PP...',
  '...ss..ss...',
  '............',
]
const CHARACTERS = {
  1: { key: 'forest', name: '森林精灵', palette: { H: 0x2f5233, S: 0xf2c79b, B: 0x3f9b4f, P: 0x2f6b3a, s: 0x5a3a22 } },
  2: { key: 'ocean', name: '海洋之心', palette: { H: 0x1e40af, S: 0xf2c79b, B: 0x3b82f6, P: 0x1e3a8a, s: 0x374151 } },
  3: { key: 'sky', name: '天空旅者', palette: { H: 0x0369a1, S: 0xf2c79b, B: 0x7dd3fc, P: 0x0c4a6e, s: 0x334155 } },
  4: { key: 'earth', name: '大地行者', palette: { H: 0x7c4a12, S: 0xf2c79b, B: 0xd98e1a, P: 0x92400e, s: 0x4a2c0a } },
}

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
    this.characterId = 1
    this.frame = 0
    this.facing = 1
    this.CYCLE = 100 // 昼夜循环秒数
  }

  init() {
    const cid = parseInt(localStorage.getItem('carbon_character_id') || '1', 10)
    this.characterId = CHARACTERS[cid] ? cid : 1
  }

  create() {
    this.WORLD_W = 4800
    this.WORLD_H = 1400

    this.createTextures()
    this.cameras.main.setBackgroundColor('#8ec9e8')

    try {
      this.createSky()      // 远山 / 太阳月亮 / 云
      this.createTerrain()  // 群系地表 + 地下层 + 装饰
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
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.virtualInput = { left: false, right: false, jump: false }
    window.__carbonVirtualInput = this.virtualInput

    // 夜晚氛围罩（全屏，随昼夜透明度变化）
    this.nightOverlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x0a0a2e, 0)
      .setScrollFactor(0).setDepth(50)
    // 星空（屏幕空间，夜晚显现）
    this.stars = []
    const rnd = mulberry32(20260824)
    for (let i = 0; i < 90; i++) {
      const s = this.add.rectangle(
        rnd() * this.cameras.main.width, rnd() * this.cameras.main.height * 0.7,
        rnd() < 0.8 ? 2 : 3, rnd() < 0.8 ? 2 : 3,
        rnd() < 0.7 ? 0xffffff : 0xa8d4ff, 0
      ).setScrollFactor(0).setDepth(51)
      this.stars.push(s)
    }

    // HUD 调试
    this.hudText = this.add
      .text(16, 16, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#000000',
        backgroundColor: '#ffff00',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
  }

  // ================= 像素纹理生成 =================
  createTextures() {
    for (const cid in CHARACTERS) {
      this.createPlayerTexture('char_' + cid, CHARACTERS[cid].palette)
    }
    this.createOakTexture()
    this.createCactusTexture()
    this.createPineTexture()
    this.createCloudTexture()
    this.createSunMoonTexture()
  }

  // 角色像素纹理: 12x16 块 @2，带暗色描边
  createPlayerTexture(key, palette) {
    const w = 12, h = PLAYER_SHAPE.length
    const tex = this.textures.createCanvas(key, w * PX, h * PX)
    const ctx = tex.context
    const map = { H: palette.H, S: palette.S, B: palette.B, P: palette.P, s: palette.s, x: 0x1c1c1c }
    const has = (r, c) => r >= 0 && r < h && c >= 0 && c < w && PLAYER_SHAPE[r][c] !== '.'
    // 第一遍: 画所有颜色块
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const ch = PLAYER_SHAPE[r][c]
        if (ch === '.') continue
        ctx.fillStyle = hexStr(map[ch])
        ctx.fillRect(c * PX, r * PX, PX, PX)
      }
    }
    // 第二遍: 边缘块描暗色轮廓（像素画经典描边）
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const ch = PLAYER_SHAPE[r][c]
        if (ch === '.') continue
        if (!has(r - 1, c) || !has(r + 1, c) || !has(r, c - 1) || !has(r, c + 1)) {
          ctx.fillStyle = '#1a1a1a'
          ctx.fillRect(c * PX, r * PX, PX, PX)
        }
      }
    }
    tex.refresh()
  }

  // 像素圆（块坐标，2px 一块，无抗锯齿）
  pixelCircle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) ctx.fillRect((cx + x) * PX, (cy + y) * PX, PX, PX)
      }
    }
  }

  createOakTexture() {
    const w = 24, h = 28 // 块
    const tex = this.textures.createCanvas('tree_oak', w * PX, h * PX)
    const ctx = tex.context
    const rnd = mulberry32(101)
    ctx.fillStyle = '#6b4226'
    ctx.fillRect(10 * PX, 16 * PX, 4 * PX, 12 * PX) // 树干
    this.pixelCircle(ctx, 12, 9, 8, '#2f7d3a')
    this.pixelCircle(ctx, 7, 12, 5, '#3f9b4f')
    this.pixelCircle(ctx, 17, 12, 5, '#3f9b4f')
    this.pixelCircle(ctx, 12, 5, 5, '#4fb85f')
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rnd() < 0.5 ? '#5fc96e' : '#2a6e34'
      ctx.fillRect(Math.floor(rnd() * w) * PX, Math.floor(rnd() * 13) * PX, PX, PX)
    }
    tex.refresh()
  }

  createCactusTexture() {
    const w = 14, h = 24 // 块
    const tex = this.textures.createCanvas('tree_cactus', w * PX, h * PX)
    const ctx = tex.context
    const rnd = mulberry32(202)
    ctx.fillStyle = '#3f9b4f'
    ctx.fillRect(3 * PX, 2 * PX, 8 * PX, 22 * PX) // 主体
    ctx.fillRect(0, 12 * PX, 4 * PX, 6 * PX)      // 左臂
    ctx.fillRect(10 * PX, 8 * PX, 4 * PX, 6 * PX) // 右臂
    ctx.fillStyle = '#1e5c2a'
    ctx.fillRect(3 * PX, 2 * PX, PX, 22 * PX)     // 左描边
    ctx.fillRect(10 * PX, 2 * PX, PX, 22 * PX)    // 右描边
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rnd() < 0.5 ? '#2f7d3a' : '#5fc96e'
      ctx.fillRect(Math.floor(4 + rnd() * 6) * PX, Math.floor(4 + rnd() * 18) * PX, PX, PX)
    }
    tex.refresh()
  }

  createPineTexture() {
    const w = 22, h = 28 // 块
    const tex = this.textures.createCanvas('tree_pine', w * PX, h * PX)
    const ctx = tex.context
    const rnd = mulberry32(303)
    ctx.fillStyle = '#5a3a22'
    ctx.fillRect(9 * PX, 18 * PX, 4 * PX, 10 * PX) // 树干
    const layers = [
      { cy: 14, r: 8 },
      { cy: 8, r: 7 },
      { cy: 3, r: 5 },
    ]
    for (const L of layers) {
      this.pixelCircle(ctx, 11, L.cy, L.r, '#2c5f3a')
      // 顶部积雪
      ctx.fillStyle = '#eef6ff'
      for (let x = -L.r; x <= L.r; x++) {
        const halfH = Math.floor(Math.sqrt(L.r * L.r - x * x))
        for (let y = -L.r; y <= -L.r + Math.floor(halfH * 0.35); y++) {
          ctx.fillRect((11 + x) * PX, (L.cy + y) * PX, PX, PX)
        }
      }
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = rnd() < 0.5 ? '#ffffff' : '#1f4a2c'
      ctx.fillRect(Math.floor(rnd() * w) * PX, Math.floor(rnd() * 16) * PX, PX, PX)
    }
    tex.refresh()
  }

  createCloudTexture() {
    const w = 40, h = 16 // 块
    const tex = this.textures.createCanvas('cloud', w * PX, h * PX)
    const ctx = tex.context
    this.pixelCircle(ctx, 10, 10, 6, '#ffffff')
    this.pixelCircle(ctx, 20, 7, 8, '#ffffff')
    this.pixelCircle(ctx, 30, 10, 6, '#ffffff')
    ctx.fillStyle = '#dbe4ee'
    for (let x = 4; x < 36; x++) ctx.fillRect(x * PX, 14 * PX, PX, PX)
    tex.refresh()
  }

  createSunMoonTexture() {
    // 太阳（12x12 块 = 24px）
    let tex = this.textures.createCanvas('sun', 12 * PX, 12 * PX)
    let ctx = tex.context
    this.pixelCircle(ctx, 6, 6, 5, '#ffd23f')
    this.pixelCircle(ctx, 6, 6, 3, '#ffe98a')
    tex.refresh()
    // 月亮（月牙: 圆 - 偏移圆）
    tex = this.textures.createCanvas('moon', 12 * PX, 12 * PX)
    ctx = tex.context
    this.pixelCircle(ctx, 6, 6, 4, '#f5f0dc')
    ctx.fillStyle = '#101c38'
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        if (x * x + y * y <= 9) ctx.fillRect((8 + x) * PX, (5 + y) * PX, PX, PX)
      }
    }
    tex.refresh()
  }

  // ================= 场景搭建 =================
  createSky() {
    const W = this.WORLD_W
    // 双层视差远山（像素柱状剪影 + 山体延伸到底，保证任何地表高度下都被地形盖住，无悬空感；分两段画避免超 4096）
    const drawRange = (key, scroll, baseH, amp, pick) => {
      const CHUNK = 2400
      const MH = 1000 // 山体画布高度（覆盖最深地表 960）
      for (let start = 0; start < W; start += CHUNK) {
        const w = Math.min(CHUNK, W - start)
        const cv = this.textures.createCanvas(key + '_' + start, w, MH)
        const ctx = cv.context
        let seed = key.length * 131 + start + 7
        let prevH = baseH
        for (let x = 0; x < w; x += 20) {
          seed = (seed * 9301 + 49297) % 233280
          const r = seed / 233280
          const b = biomeAt(start + x)
          const target = baseH + Math.sin((start + x) * 0.003 + scroll * 3) * amp + (r - 0.5) * amp * 0.7
          prevH = prevH + (target - prevH) * 0.3
          const colH = Math.max(50, Math.min(430, Math.round(prevH)))
          const peakTop = 500 - colH // 峰顶位置（保留原有天际线轮廓）
          ctx.fillStyle = hexStr(pick(b))
          ctx.fillRect(x, peakTop, 20, MH - peakTop) // 峰顶以下整段山体
        }
        cv.refresh()
        this.add.image(start + w / 2, 0, key + '_' + start).setOrigin(0.5, 0).setScrollFactor(scroll, scroll).setDepth(-10)
      }
    }
    drawRange('mt_far', 0.15, 300, 70, (b) => b.mountainFar)
    drawRange('mt_near', 0.4, 380, 90, (b) => b.mountainNear)

    // 太阳/月亮（屏幕空间固定，昼夜交替）
    const cam = this.cameras.main
    this.sun = this.add.image(cam.width * 0.16, 80, 'sun').setScrollFactor(0).setDepth(-8)
    this.moon = this.add.image(cam.width * 0.82, 80, 'moon').setScrollFactor(0).setDepth(-8).setAlpha(0)

    // 云朵（视差缓慢漂移）
    this.clouds = []
    const crnd = mulberry32(77)
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(crnd() * W, 90 + crnd() * 140, 'cloud')
        .setScrollFactor(0.5, 0.5).setDepth(-3).setAlpha(0.9)
      c.speed = 0.15 + crnd() * 0.25
      c.dir = crnd() < 0.5 ? 1 : -1
      this.clouds.push(c)
    }
  }

  createTerrain() {
    // 隐形碰撞：每列一根连续实体柱（地表往下 260px 完全实心，列间无缝）→ 落脚点绝对连续，不会掉下去
    this.grounds = []
    const cols = Math.ceil(this.WORLD_W / TILE)
    const DEPTH = 260
    for (let i = 0; i < cols; i++) {
      const x = i * TILE + TILE / 2
      const surfaceY = surfaceYAt(i)
      const rect = this.add.rectangle(x, surfaceY + DEPTH / 2, TILE, DEPTH, 0x000000).setVisible(false)
      this.physics.add.existing(rect, true)
      this.grounds.push(rect)
    }
    // 连续地形视觉（按世界坐标绘制，无方块接缝）
    this.createTerrainVisual()
    // 群系装饰（橡树/仙人掌/雪松），随机间隔 + 轻微抖动
    const drnd = mulberry32(888)
    for (const b of BIOMES) {
      for (let x = b.from + 60; x < b.to - 40; x += 60 + Math.floor(drnd() * 90)) {
        const col = Math.floor(x / TILE)
        const surfaceY = surfaceYAt(col)
        this.add.image(x + (drnd() - 0.5) * 30, surfaceY, b.tree)
          .setDepth(1).setOrigin(0.5, 1)
      }
    }
  }

  // 连续地形：整段画布按世界坐标逐块绘制（噪点基于全局坐标 → 跨方块无缝，无格子感）
  createTerrainVisual() {
    const CHUNK = 2400     // 每段宽度（< 4096 纹理上限）
    const TOP = 440        // 画布顶部对应的世界 y
    const H = 800          // 覆盖地表(520~960) + 碰撞深度(260) + 余量，视觉=碰撞完全对齐
    const VIS_DEPTH = 260  // 与碰撞柱体深度一致，立面不会露出透明断层
    for (let start = 0; start < this.WORLD_W; start += CHUNK) {
      const w = Math.min(CHUNK, this.WORLD_W - start)
      const tex = this.textures.createCanvas('terrain_' + start, w, H)
      const ctx = tex.context
      for (let px = 0; px < w; px += 2) {
        const wx = start + px
        const sy = surfaceYAt(Math.floor(wx / TILE))
        const b = biomeAt(wx)
        const desert = b.name === '沙漠'
        for (let py = 0; py < H; py += 2) {
          const wy = TOP + py
          const dy = wy - sy
          let base = null
          if (dy >= 0 && dy < VIS_DEPTH) {
            if (dy < 10) base = b.grass                                // 草皮/沙/雪带
            else if (dy < 40) base = desert ? b.grass : b.dirt         // 表层（沙漠整层沙）
            else if (dy < 120) base = b.dirt                           // 泥土层
            else base = 0x7d8a99                                       // 石头层
          }
          if (base === null) continue
          // 荧光矿脉（石头层，世界坐标分布 → 连续小簇）
          if (dy >= 120 && hash2(Math.floor(wx / 6), Math.floor(wy / 6)) < 0.0035) {
            ctx.fillStyle = hash2(wx, wy) < 0.5 ? '#4deeea' : '#7dff9e'
            ctx.fillRect(px, py, 2, 2)
            continue
          }
          // 噪点（世界坐标 → 跨方块连续）
          const r = hash2(Math.floor(wx / 2), Math.floor(wy / 2))
          if (r < 0.13) ctx.fillStyle = hexStr(shade(base, 0.86))
          else if (r > 0.86) ctx.fillStyle = hexStr(shade(base, 1.14))
          else if (dy < 10 && hash2(wx, wy) < 0.35) ctx.fillStyle = hexStr(b.grassLight) // 草皮亮点
          else ctx.fillStyle = hexStr(base)
          ctx.fillRect(px, py, 2, 2)
        }
      }
      tex.refresh()
      this.add.image(start + w / 2, TOP, 'terrain_' + start).setOrigin(0.5, 0).setDepth(0)
    }
  }

  createPlayer() {
    const spawnY = surfaceYAt(5) - 40
    this.player = this.add.image(200, spawnY, 'char_' + this.characterId)
    this.player.setDepth(2) // 渲染在树(1)/地形(0)之上
    this.physics.add.existing(this.player, false)
    this.player.body.setSize(20, 30)
    this.player.body.setOffset(2, 1)
    this.player.body.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.grounds)
  }

  // ================= 每帧 =================
  update(time, delta) {
    if (!this.player) return
    const dt = delta / 1000
    const speed = 240
    const left = this.cursors.left.isDown || this.keyA.isDown || this.virtualInput.left
    const right = this.cursors.right.isDown || this.keyD.isDown || this.virtualInput.right

    this.player.body.setVelocityX(0)
    if (left) {
      this.player.body.setVelocityX(-speed)
      if (this.facing !== -1) { this.facing = -1; this.player.setFlipX(true) }
    } else if (right) {
      this.player.body.setVelocityX(speed)
      if (this.facing !== 1) { this.facing = 1; this.player.setFlipX(false) }
    }

    const onGround = this.player.body.blocked.down || this.player.body.touching.down
    if ((Phaser.Input.Keyboard.JustDown(this.jumpKey) || this.virtualInput.jump) && onGround) {
      this.player.body.setVelocityY(-520)
      this.virtualInput.jump = false
    }

    // ---- 昼夜动态 ----
    const t = (time / 1000 % this.CYCLE) / this.CYCLE
    let night = 0
    if (t < 0.4) night = 0
    else if (t < 0.55) night = (t - 0.4) / 0.15
    else if (t < 0.9) night = 1
    else night = 1 - (t - 0.9) / 0.1
    const b = biomeAt(this.player.x)
    let sky = mixHex(b.skyDay, b.skyNight, night)
    const sunset = 1 - Math.min(1, Math.abs(t - 0.48) / 0.09) // 黄昏橙调
    if (sunset > 0) sky = mixHex(sky, 0xff8c42, sunset * 0.45)
    this.cameras.main.setBackgroundColor(sky)

    const nightClamped = clamp(night, 0, 1)
    for (const s of this.stars) s.setAlpha(nightClamped * (0.5 + 0.5 * Math.random()))
    this.nightOverlay.setAlpha(nightClamped * 0.4)
    this.sun.setAlpha(1 - nightClamped)
    this.moon.setAlpha(nightClamped)

    // 云朵漂移
    for (const c of this.clouds) {
      c.x += c.speed * c.dir * dt * 60
      if (c.x > this.WORLD_W + 120) c.x = -120
      if (c.x < -120) c.x = this.WORLD_W + 120
    }

    // ---- 摄像机居中跟随 ----
    const cam = this.cameras.main
    cam.scrollX = this.player.x - cam.width / 2
    cam.scrollY = this.player.y - cam.height / 2

    // HUD
    if (this.hudText) {
      const phase = night > 0.5 ? '☾ 夜' : night > 0.05 ? '🌇 黄昏' : '☀ 昼'
      this.hudText.setText(
        `角色x:${Math.round(this.player.x)} 镜头x:${Math.round(cam.scrollX)} | ${b.name} ${phase}`
      )
    }

    this.frame++
    if (this.frame % 30 === 0) {
      console.log(`[World] 角色x=${Math.round(this.player.x)} 镜头x=${Math.round(cam.scrollX)} 群系=${b.name}`)
    }
  }
}
