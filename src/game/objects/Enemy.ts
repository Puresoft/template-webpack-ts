import Phaser from 'phaser';

export default class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private health: number;
  private maxHealth: number;
  private damage: number;
  private healthBar: Phaser.GameObjects.Rectangle;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private unitCount: number;
  private unitText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: 'basic' | 'tank' | 'boss' = 'basic') {
    // Set properties based on enemy type
    switch (type) {
      case 'tank':
        this.health = 200;
        this.maxHealth = 200;
        this.damage = 15;
        this.unitCount = 50;
        break;
      case 'boss':
        this.health = 500;
        this.maxHealth = 500;
        this.damage = 30;
        this.unitCount = 100;
        break;
      default: // basic
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 10;
        this.unitCount = 20;
    }
    
    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'enemy');
    this.sprite.setScale(type === 'boss' ? 2 : 1.5);
    this.sprite.setImmovable(true);
    this.sprite.setTint(type === 'tank' ? 0x808080 : type === 'boss' ? 0xff0000 : 0xffffff);
    
    // Health Bar
    this.healthBarBg = scene.add.rectangle(x, y - 40, 60, 8, 0x000000);
    this.healthBar = scene.add.rectangle(x, y - 40, 56, 4, 0xff0000);
    
    // Unit Count Text
    this.unitText = scene.add.text(x, y - 55, `${this.unitCount}`, {
      fontSize: '16px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.unitText.setOrigin(0.5);
  }

  update() {
    // Update UI positions
    this.healthBarBg.x = this.sprite.x;
    this.healthBarBg.y = this.sprite.y - 40;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - 40;
    this.unitText.x = this.sprite.x;
    this.unitText.y = this.sprite.y - 55;
    
    // Update health bar width
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.width = 56 * healthPercent;
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.destroy();
      return true; // Enemy defeated
    }
    return false;
  }

  getDamage(): number {
    return this.damage;
  }

  getHealth(): number {
    return this.health;
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBg.destroy();
    this.unitText.destroy();
  }
} 