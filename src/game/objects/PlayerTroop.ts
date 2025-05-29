import Phaser from 'phaser';

interface PlayerUnit {
  sprite: Phaser.Physics.Arcade.Sprite;
  offsetX: number;
  offsetY: number;
}

export default class PlayerTroop {
  public sprite: Phaser.Physics.Arcade.Sprite; // Haupt-Player (für Kollisionserkennung)
  private playerUnits: PlayerUnit[] = [];
  private unitCount: number = 1; // Startet mit 1 Einheit
  private damage: number = 10;
  private health: number = 100;
  private maxHealth: number = 100;
  private healthBar: Phaser.GameObjects.Rectangle;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private unitText: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private lastShotTime: number = 0;
  private fireRate: number = 300; // Millisekunden zwischen Schüssen
  private scene: Phaser.Scene;
  private formationCenterX: number;
  private formationCenterY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.formationCenterX = x;
    this.formationCenterY = y;
    
    // Erstelle Haupt-Sprite mit Physik
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setScale(1.5);
    this.sprite.setCollideWorldBounds(true);
    
    // Füge erste Einheit zur Formation hinzu
    this.playerUnits.push({
      sprite: this.sprite,
      offsetX: 0,
      offsetY: 0
    });
    
    // Tastatursteuerung einrichten
    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.wasdKeys = scene.input.keyboard?.addKeys('W,S,A,D') as { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Health Bar
    this.healthBarBg = scene.add.rectangle(x, y - 40, 60, 8, 0x000000);
    this.healthBar = scene.add.rectangle(x, y - 40, 56, 4, 0x00ff00);
    
    // Unit Count Text
    this.unitText = scene.add.text(x, y - 55, `${this.unitCount}`, {
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.unitText.setOrigin(0.5);
  }

  update() {
    // Tastatursteuerung - nur links/rechts Bewegung
    const speed = 200;
    
    if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) {
      this.formationCenterX -= speed * (1/60); // Annahme: 60 FPS
      this.sprite.setVelocityX(-speed);
    } else if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) {
      this.formationCenterX += speed * (1/60);
      this.sprite.setVelocityX(speed);
    } else {
      this.sprite.setVelocityX(0);
    }
    
    // Keine vertikale Bewegung
    this.sprite.setVelocityY(0);
    
    // Update Formation - alle Einheiten folgen der Formation
    this.updateFormation();
    
    // Schießen mit Spacebar oder W-Taste - ALLE Einheiten schießen
    const currentTime = this.scene.time.now;
    if ((this.spaceKey?.isDown || this.wasdKeys?.W.isDown) && currentTime - this.lastShotTime > this.fireRate) {
      this.shootAllUnits();
      this.lastShotTime = currentTime;
    }
    
    // Update UI positions to follow main sprite
    this.healthBarBg.x = this.sprite.x;
    this.healthBarBg.y = this.sprite.y - 40;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - 40;
    this.unitText.x = this.sprite.x;
    this.unitText.y = this.sprite.y - 55;
    
    // Update health bar width
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.width = 56 * healthPercent;
    
    // Update color based on health
    if (healthPercent > 0.6) {
      this.healthBar.fillColor = 0x00ff00;
    } else if (healthPercent > 0.3) {
      this.healthBar.fillColor = 0xffff00;
    } else {
      this.healthBar.fillColor = 0xff0000;
    }
  }

  private updateFormation() {
    this.formationCenterX = this.sprite.x;
    
    // Berechne Formation-Layout (horizontale Linie)
    for (let i = 0; i < this.playerUnits.length; i++) {
      const unit = this.playerUnits[i];
      
      if (i === 0) {
        // Haupt-Player bleibt in der Mitte
        continue;
      }
      
      // Berechne Position für zusätzliche Einheiten
      const spacing = 60; // Abstand zwischen Einheiten
      const totalWidth = (this.playerUnits.length - 1) * spacing;
      const startX = this.formationCenterX - totalWidth / 2;
      
      const targetX = startX + (i - 1) * spacing + (i > this.playerUnits.length / 2 ? spacing : 0);
      const targetY = this.formationCenterY;
      
      // Smooth movement towards target position
      const currentX = unit.sprite.x;
      const currentY = unit.sprite.y;
      const lerp = 0.1;
      
      unit.sprite.x = currentX + (targetX - currentX) * lerp;
      unit.sprite.y = currentY + (targetY - currentY) * lerp;
    }
  }

  private shootAllUnits() {
    // Alle Einheiten schießen gleichzeitig
    for (const unit of this.playerUnits) {
      this.scene.events.emit('playerShoot', {
        x: unit.sprite.x,
        y: unit.sprite.y - 20,
        damage: this.damage
      });
    }
  }

  addUnits(amount: number) {
    const previousCount = this.unitCount;
    const maxUnits = 10;
    
    // Berechne wie viele Einheiten tatsächlich hinzugefügt werden können
    const actualAmount = Math.min(amount, maxUnits - this.unitCount);
    
    if (actualAmount <= 0) {
      console.log(`Maximale Einheitenanzahl erreicht! (${maxUnits})`);
      return;
    }
    
    this.unitCount += actualAmount;
    this.unitText.setText(`${this.unitCount}`);
    
    // Erstelle neue Spielerfiguren für jede hinzugefügte Einheit
    for (let i = 0; i < actualAmount; i++) {
      this.createNewUnit();
    }
    
    console.log(`Neue Einheitengröße: ${previousCount} → ${this.unitCount} (+${actualAmount} neue Figuren)`);
    
    if (this.unitCount >= maxUnits) {
      console.log(`🏆 Maximale Armee erreicht! (${maxUnits} Spieler)`);
    }
  }

  private createNewUnit() {
    // Erstelle neue Spielerfigur
    const newSprite = this.scene.physics.add.sprite(this.formationCenterX, this.formationCenterY, 'player');
    newSprite.setScale(1.5);
    newSprite.setCollideWorldBounds(true);
    
    // Füge zur Formation hinzu
    this.playerUnits.push({
      sprite: newSprite,
      offsetX: 0,
      offsetY: 0
    });
  }

  multiplyUnits(multiplier: number) {
    const previousCount = this.unitCount;
    const maxUnits = 10;
    
    // Berechne neue Anzahl, aber respektiere das Maximum
    const targetCount = this.unitCount * multiplier;
    const newCount = Math.min(targetCount, maxUnits);
    const additionalUnits = newCount - this.unitCount;
    
    if (additionalUnits <= 0) {
      console.log(`Keine neuen Einheiten - Maximum bereits erreicht! (${maxUnits})`);
      return;
    }
    
    this.unitCount = newCount;
    this.unitText.setText(`${this.unitCount}`);
    
    // Erstelle neue Figuren für die zusätzlichen Einheiten
    for (let i = 0; i < additionalUnits; i++) {
      this.createNewUnit();
    }
    
    console.log(`Einheiten multipliziert: ${previousCount} → ${this.unitCount} (+${additionalUnits} neue Figuren)`);
    
    if (targetCount > maxUnits) {
      console.log(`⚠️ Multiplikator begrenzt durch Maximum von ${maxUnits} Einheiten`);
    }
    
    if (this.unitCount >= maxUnits) {
      console.log(`🏆 Maximale Armee erreicht! (${maxUnits} Spieler)`);
    }
  }

  upgradeDamage(amount: number) {
    this.damage += amount;
  }

  upgradeFireRate(amount: number) {
    this.fireRate = Math.max(50, this.fireRate - amount);
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
    }
  }

  getDamage(): number {
    return this.damage * this.unitCount;
  }

  getHealth(): number {
    return this.health;
  }

  getUnitCount(): number {
    return this.unitCount;
  }

  destroy() {
    // Zerstöre alle Einheiten
    for (const unit of this.playerUnits) {
      unit.sprite.destroy();
    }
    this.healthBar.destroy();
    this.healthBarBg.destroy();
    this.unitText.destroy();
  }
} 