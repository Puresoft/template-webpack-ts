import { Scene } from 'phaser';
import PlayerTroop from '../objects/PlayerTroop';
import Enemy from '../objects/Enemy';
import Upgrade, { UpgradeType } from '../objects/Upgrade';
import Bullet from '../objects/Bullet';

export class Game extends Scene
{
    private player!: PlayerTroop;
    private enemies: Enemy[] = [];
    private upgrades: Upgrade[] = [];
    private bullets: Bullet[] = [];
    private road!: Phaser.GameObjects.TileSprite;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private waveNumber: number = 1;
    private waveText!: Phaser.GameObjects.Text;
    private isInCombat: boolean = false;
    private combatTimer?: Phaser.Time.TimerEvent;
    private isCheckingWave: boolean = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        // Erstelle Straße/Hintergrund (vertikal orientiert)
        this.road = this.add.tileSprite(512, 384, 1024, 768, 'road');
        this.road.setAlpha(0.3);
        
        // Erstelle Spieler (bleibt am unteren Rand)
        this.player = new PlayerTroop(this, 512, 650);
        
        // Event Listener für Schüsse
        this.events.on('playerShoot', (shootData: {x: number, y: number, damage: number}) => {
            this.createBullet(shootData.x, shootData.y, shootData.damage);
        });
        
        // UI Elements
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        
        this.waveText = this.add.text(16, 56, 'Wave: 1', {
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        
        // Steuerungsanweisungen
        this.add.text(16, 700, 'Steuerung: ← → bewegen | Leertaste/W schießen', {
            fontSize: '18px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        });
        
        // Spawn erste Welle
        this.time.delayedCall(1000, () => this.spawnWave());
    }

    update(_time: number, _delta: number): void
    {
        // Update Player
        this.player.update();
        
        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const shouldRemove = bullet.update();
            
            if (shouldRemove) {
                this.bullets.splice(i, 1);
            }
        }
        
        // Update Enemies - bewege sie nach unten zum Spieler
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update();
            
            // Bewege Gegner nach unten
            enemy.sprite.y += 1;
            
            // Entferne Gegner wenn sie den unteren Bildschirmrand erreichen
            if (enemy.sprite.y > 800) {
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }
        
        // Update Upgrades - bewege sie nach unten zum Spieler
        for (let i = this.upgrades.length - 1; i >= 0; i--) {
            const upgrade = this.upgrades[i];
            
            // Bewege Upgrade nach unten
            upgrade.sprite.y += 2;
            
            // Entferne Upgrade wenn es den unteren Bildschirmrand erreicht
            if (upgrade.sprite.y > 800) {
                upgrade.destroy();
                this.upgrades.splice(i, 1);
            }
        }
        
        // Move road to create movement effect (von oben nach unten)
        this.road.tilePositionY += 2;
        
        // Check for bullet-enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (this.checkCollision(bullet.sprite, enemy.sprite)) {
                    // Enemy nimmt Schaden
                    const defeated = enemy.takeDamage(bullet.getDamage());
                    
                    // Entferne Bullet
                    bullet.destroy();
                    this.bullets.splice(i, 1);
                    
                    if (defeated) {
                        // Entferne Enemy und gib Punkte
                        this.enemies.splice(j, 1);
                        this.score += 50 * this.waveNumber;
                        this.scoreText.setText(`Score: ${this.score}`);
                    }
                    
                    break; // Bullet hat getroffen, prüfe keine weiteren Gegner
                }
            }
        }
        
        // Check for collisions with upgrades
        for (let i = this.upgrades.length - 1; i >= 0; i--) {
            const upgrade = this.upgrades[i];
            if (this.checkCollision(this.player.sprite, upgrade.sprite)) {
                this.applyUpgrade(upgrade);
                upgrade.destroy();
                this.upgrades.splice(i, 1);
            }
        }
        
        // Check for combat (nur wenn Gegner den Spieler berührt)
        if (!this.isInCombat) {
            for (const enemy of this.enemies) {
                if (this.checkCollision(this.player.sprite, enemy.sprite)) {
                    this.startCombat(enemy);
                    break;
                }
            }
        }
        
        // Check if wave is cleared - NEUE LOGIK
        if (this.enemies.length === 0 && !this.isInCombat && !this.isCheckingWave) {
            // Prüfe ob noch Gegner gespawnt werden (delayed calls aktiv)
            this.checkWaveComplete();
        }
    }

    private checkWaveComplete() {
        this.isCheckingWave = true;
        
        // Warte kurz und prüfe nochmal ob wirklich alle Gegner weg sind
        this.time.delayedCall(1000, () => {
            if (this.enemies.length === 0) {
                console.log(`Wave ${this.waveNumber} completed! Starting next wave...`);
                this.nextWave();
            }
            this.isCheckingWave = false;
        });
    }

    private createBullet(x: number, y: number, damage: number) {
        const bullet = new Bullet(this, x, y, damage);
        this.bullets.push(bullet);
    }

    private checkCollision(sprite1: Phaser.Physics.Arcade.Sprite, sprite2: Phaser.Physics.Arcade.Sprite): boolean {
        const bounds1 = sprite1.getBounds();
        const bounds2 = sprite2.getBounds();
        return Phaser.Geom.Rectangle.Overlaps(bounds1, bounds2);
    }

    private startCombat(enemy: Enemy) {
        this.isInCombat = true;
        
        // Combat timer - damage per second
        this.combatTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                // Player attacks enemy
                const defeated = enemy.takeDamage(this.player.getDamage() / 10);
                if (defeated) {
                    this.endCombat(enemy, true);
                    return;
                }
                
                // Enemy attacks player
                this.player.takeDamage(enemy.getDamage() / 10);
                if (this.player.getHealth() <= 0) {
                    this.endCombat(enemy, false);
                }
            },
            loop: true
        });
    }

    private endCombat(enemy: Enemy, playerWon: boolean) {
        if (this.combatTimer) {
            this.combatTimer.destroy();
        }
        
        this.isInCombat = false;
        
        if (playerWon) {
            // Remove enemy from array
            const index = this.enemies.indexOf(enemy);
            if (index > -1) {
                this.enemies.splice(index, 1);
            }
            
            // Add score
            this.score += 100 * this.waveNumber;
            this.scoreText.setText(`Score: ${this.score}`);
            
            // Check if wave cleared (alle Gegner besiegt oder verlassen)
            if (this.enemies.length === 0) {
                this.time.delayedCall(2000, () => this.nextWave());
            }
        } else {
            // Game Over
            this.scene.start('GameOver');
        }
    }

    private applyUpgrade(upgrade: Upgrade) {
        const type = upgrade.getType();
        const value = upgrade.getValue();
        
        switch (type) {
            case 'addUnits':
                this.player.addUnits(value);
                break;
            case 'multiplyUnits':
                this.player.multiplyUnits(value);
                break;
            case 'damage':
                this.player.upgradeDamage(value);
                break;
            case 'weapon':
                // Verbessere Feuerrate
                this.player.upgradeFireRate(50);
                this.player.upgradeDamage(10);
                break;
        }
        
        // Add score for collecting upgrade
        this.score += 50;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    private spawnWave() {
        // Spawn upgrades (von oben, kommen nach unten)
        const upgradeTypes: Array<{type: UpgradeType, value: number}> = [
            {type: 'addUnits', value: 1},
            {type: 'multiplyUnits', value: 2},
            {type: 'damage', value: 5},
            {type: 'weapon', value: 1}
        ];
        
        // Random upgrades spawnen über die Zeit
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 2000, () => {
                const randomUpgrade = Phaser.Math.RND.pick(upgradeTypes);
                const x = 200 + Math.random() * 600; // Zufällige X-Position
                const y = -50; // Starten oben außerhalb des Bildschirms
                const upgrade = new Upgrade(this, x, y, randomUpgrade.type, randomUpgrade.value);
                this.upgrades.push(upgrade);
            });
        }
        
        // Spawn enemies (von oben, kommen nach unten)
        const enemyCount = Math.min(5 + Math.floor(this.waveNumber / 2), 12);
        for (let i = 0; i < enemyCount; i++) {
            this.time.delayedCall(i * 1500 + 3000, () => {
                const x = 150 + Math.random() * 700; // Zufällige X-Position
                const y = -50; // Starten oben außerhalb des Bildschirms
                const enemyType = this.waveNumber % 5 === 0 ? 'boss' : 
                                this.waveNumber % 3 === 0 ? 'tank' : 'basic';
                const enemy = new Enemy(this, x, y, enemyType);
                this.enemies.push(enemy);
            });
        }
    }

    private nextWave() {
        this.waveNumber++;
        this.waveText.setText(`Wave: ${this.waveNumber}`);
        this.spawnWave();
    }
}
