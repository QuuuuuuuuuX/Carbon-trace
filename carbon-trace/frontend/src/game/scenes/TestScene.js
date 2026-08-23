// 泰拉瑞亚风测试场景：可左右移动 + 跳跃的像素小人（Phase 3 会换成正式地图）
import Phaser from 'phaser'

export default class TestScene extends Phaser.Scene {
  constructor() {
    super('TestScene')
  }

  create() {
    // 像素风：关闭抗锯齿
    this.cameras.main.setBackgroundColor('#1a2a1a')
    this.physics.world.setBounds(0, 0, 960, 540)

    // 地面
    const ground = this.add.rectangle(480, 500, 960, 80, 0x3a5f3a)
    this.physics.add.existing(ground, true)

    // 像素小人（用方块拼，之后换成角色 sprite）
    this.player = this.add.rectangle(200, 400, 32, 48, 0x88d4ff)
    this.physics.add.existing(this.player)
    this.player.body.setCollideWorldBounds(true)

    this.physics.add.collider(this.player, ground)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // 提示文字
    this.add
      .text(480, 60, '碳迹 · Phaser 测试场景（←→ 移动 / 空格 跳跃）', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#cde8cd',
      })
      .setOrigin(0.5)
  }

  update() {
    const speed = 200
    this.player.body.setVelocityX(0)
    if (this.cursors.left.isDown) this.player.body.setVelocityX(-speed)
    else if (this.cursors.right.isDown) this.player.body.setVelocityX(speed)

    const onGround = this.player.body.blocked.down
    if (Phaser.Input.Keyboard.JustDown(this.jumpKey) && onGround) {
      this.player.body.setVelocityY(-420)
    }
  }
}
