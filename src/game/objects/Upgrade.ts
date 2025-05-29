import Phaser from 'phaser';

export type UpgradeType = 'addUnits' | 'multiplyUnits' | 'damage' | 'weapon';

export default class Upgrade {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private type: UpgradeType;
  private value: number;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: UpgradeType, value: number) {
    this.type = type;
    this.value = value;
    
    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'upgrade');
    this.sprite.setScale(1.2);
    this.sprite.setImmovable(true);
    
    // Set color based on type
    switch (type) {
      case 'addUnits':
        this.sprite.setTint(0x00ff00);
        break;
      case 'multiplyUnits':
        this.sprite.setTint(0xffff00);
        break;
      case 'damage':
        this.sprite.setTint(0xff0000);
        break;
      case 'weapon':
        this.sprite.setTint(0xff00ff);
        break;
    }
    
    // Create label
    let labelText = '';
    switch (type) {
      case 'addUnits':
        labelText = `+${value}`;
        break;
      case 'multiplyUnits':
        labelText = `x${value}`;
        break;
      case 'damage':
        labelText = `DMG+${value}`;
        break;
      case 'weapon':
        labelText = 'WEAPON';
        break;
    }
    
    this.label = scene.add.text(x, y, labelText, {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.label.setOrigin(0.5);
  }

  getType(): UpgradeType {
    return this.type;
  }

  getValue(): number {
    return this.value;
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
  }
} 