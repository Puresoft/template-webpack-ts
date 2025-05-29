import Phaser from 'phaser';

export default class Bullet {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, damage: number = 20) {
    this.damage = damage;
    
    // Erstelle Bullet Sprite
    this.sprite = scene.physics.add.sprite(x, y, 'bullet');
    this.sprite.setScale(0.5);
    this.sprite.setVelocityY(-400); // Schnelle Bewegung nach oben
    
    // Setze Bullet-Eigenschaften
    this.sprite.body!.setSize(8, 16); // Kleinere Hitbox für präzisere Kollision
  }

  update(): boolean {
    // Entferne Bullet wenn er den oberen Bildschirmrand verlässt
    if (this.sprite.y < -50) {
      this.destroy();
      return true; // Signal dass Bullet entfernt werden soll
    }
    return false;
  }

  getDamage(): number {
    return this.damage;
  }

  destroy() {
    this.sprite.destroy();
  }
} 