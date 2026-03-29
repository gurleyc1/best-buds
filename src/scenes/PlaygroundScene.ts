import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';
import { MusicManager } from '../systems/MusicManager';

export class PlaygroundScene extends Phaser.Scene {
  protected sceneData: { returnX?: number; returnY?: number } = {};

  // Characters
  private playerContainer!: Phaser.GameObjects.Container;
  private companionContainer!: Phaser.GameObjects.Container;
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private companionBubble: Phaser.GameObjects.Container | null = null;
  private companionBubbleTimer: Phaser.Time.TimerEvent | null = null;

  // Equipment positions (local to scene, no scrolling)
  private readonly MONKEY_BARS_X = 80;
  private readonly MONKEY_BARS_Y = 480;
  private readonly SLIDE_X = 210;
  private readonly SLIDE_Y = 460;
  private readonly CLIMB_WALL_X = 330;
  private readonly CLIMB_WALL_Y = 480;
  private readonly ZIP_LINE_X = 450; // left pole / start
  private readonly ZIP_LINE_Y = 390;
  private readonly DRAWBRIDGE_X = 390;
  private readonly DRAWBRIDGE_Y = 560;

  // Drawbridge state
  private bridgeRaised = false;
  private bridgePlank: Phaser.GameObjects.Graphics | null = null;
  private bridgeAnimating = false;

  // Interaction lock
  private busy = false;

  constructor() {
    super({ key: 'PlaygroundScene' });
  }

  create(data?: { returnX?: number; returnY?: number }): void {
    this.sceneData = data ?? {};
    this.busy = false;
    this.bridgeRaised = false;
    this.bridgeAnimating = false;
    this.speechBubble = null;
    this.companionBubble = null;

    SceneTransition.fadeIn(this, 300);
    MusicManager.resume();
    MusicManager.playTheme('hub');

    this.drawBackground();
    this.drawEquipment();
    this.createCharacters();
    this.setupInteractions();
    this.createUI();
    this.startCompanionCheering();
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();

    // Blue sky gradient (top half)
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb0e0ff, 0xb0e0ff, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 2);

    // Green grass (bottom half)
    g.fillGradientStyle(0x5aad3a, 0x5aad3a, 0x4a9a2a, 0x4a9a2a, 1);
    g.fillRect(0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2);

    // Soft clouds
    this.drawCloud(g, 60, 80, 0.8);
    this.drawCloud(g, 200, 50, 1.0);
    this.drawCloud(g, 360, 90, 0.7);
    this.drawCloud(g, 430, 40, 0.9);

    // Rubber safety surface under equipment
    g.fillStyle(0xd4a843, 0.5);
    g.fillRoundedRect(20, GAME_HEIGHT / 2 - 20, GAME_WIDTH - 40, 160, 10);
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(x, y, 22 * scale);
    g.fillCircle(x + 20 * scale, y - 8 * scale, 18 * scale);
    g.fillCircle(x + 38 * scale, y, 20 * scale);
    g.fillCircle(x + 18 * scale, y + 6 * scale, 22 * scale);
  }

  // ─── Equipment Drawing ───────────────────────────────────────────────────────

  private drawEquipment(): void {
    this.drawMonkeyBars();
    this.drawSlide();
    this.drawRockClimbingWall();
    this.drawZipLine();
    this.drawDrawbridge();
  }

  private drawMonkeyBars(): void {
    const g = this.add.graphics();
    const x = this.MONKEY_BARS_X;
    const topY = GAME_HEIGHT / 2 - 80;
    const botY = GAME_HEIGHT / 2 + 40;

    // Two vertical poles (yellow)
    g.fillStyle(0xf1c40f);
    g.fillRect(x - 50, topY, 8, botY - topY);
    g.fillRect(x + 42, topY, 8, botY - topY);

    // Horizontal rungs
    g.fillStyle(0xf1c40f);
    for (let ry = topY + 12; ry < topY + 80; ry += 18) {
      g.fillRect(x - 42, ry, 84, 6);
    }

    // Top rail
    g.fillStyle(0xf1c40f);
    g.fillRect(x - 54, topY - 8, 108, 8);

    // Label hint
    this.add.text(x, botY + 18, 'Monkey Bars', {
      fontSize: '11px', color: '#3a2000', stroke: '#ffffffaa', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
  }

  private drawSlide(): void {
    const g = this.add.graphics();
    const x = this.SLIDE_X;
    const platformY = GAME_HEIGHT / 2 - 90;
    const groundY = GAME_HEIGHT / 2 + 30;

    // Platform (blue)
    g.fillStyle(0x3498db);
    g.fillRect(x - 20, platformY, 50, 80);

    // Ladder (left side)
    g.fillStyle(0x2980b9);
    g.fillRect(x - 22, platformY, 6, 80);
    g.fillRect(x - 10, platformY, 6, 80);
    for (let ly = platformY + 10; ly < groundY - 10; ly += 16) {
      g.fillRect(x - 22, ly, 18, 4);
    }

    // Slide ramp (pink diagonal)
    g.fillStyle(0xff69b4);
    // Draw as a parallelogram: top-right of platform -> ground-right
    const slideTop = { x: x + 28, y: platformY + 10 };
    const slideBot = { x: x + 90, y: groundY };
    g.fillTriangle(
      slideTop.x, slideTop.y,
      slideTop.x + 14, slideTop.y,
      slideBot.x + 14, slideBot.y
    );
    g.fillTriangle(
      slideTop.x, slideTop.y,
      slideBot.x, slideBot.y,
      slideBot.x + 14, slideBot.y
    );

    // Label
    this.add.text(x + 30, groundY + 18, 'Slide', {
      fontSize: '11px', color: '#3a2000', stroke: '#ffffffaa', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
  }

  private drawRockClimbingWall(): void {
    const g = this.add.graphics();
    const x = this.CLIMB_WALL_X;
    const topY = GAME_HEIGHT / 2 - 100;
    const botY = GAME_HEIGHT / 2 + 30;
    const wallW = 60;

    // Wall (gray)
    g.fillStyle(0x95a5a6);
    g.fillRect(x - wallW / 2, topY, wallW, botY - topY);

    // Colorful holds
    const holdColors = [0x3498db, 0xff69b4, 0xf1c40f, 0xe74c3c, 0x2ecc71];
    const holdPositions: [number, number][] = [
      [-18, 20], [10, 35], [-8, 55], [15, 70], [-15, 90],
      [5, 108], [-20, 122], [12, 140], [-5, 158],
    ];
    holdPositions.forEach(([hx, hy], i) => {
      g.fillStyle(holdColors[i % holdColors.length]);
      g.fillCircle(x + hx, topY + hy, 5);
    });

    // Label
    this.add.text(x, botY + 18, 'Climbing Wall', {
      fontSize: '11px', color: '#3a2000', stroke: '#ffffffaa', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
  }

  private drawZipLine(): void {
    const g = this.add.graphics();
    // Left pole (high)
    const lx = this.ZIP_LINE_X - 80;
    const ly = GAME_HEIGHT / 2 - 120;
    const groundY = GAME_HEIGHT / 2 + 20;
    // Right pole (low)
    const rx = this.ZIP_LINE_X + 50;
    const ry = GAME_HEIGHT / 2 - 30;

    // Poles (yellow)
    g.fillStyle(0xf1c40f);
    g.fillRect(lx - 4, ly, 8, groundY - ly);
    g.fillRect(rx - 4, ry, 8, groundY - ry);

    // Cable (pink)
    g.lineStyle(3, 0xff69b4, 1);
    g.lineBetween(lx, ly + 10, rx, ry + 10);

    // Handle dot on cable
    g.fillStyle(0xff69b4);
    g.fillCircle(lx + 12, ly + 10 + ((ry - ly) * 12 / (rx - lx)), 7);

    // Label
    this.add.text((lx + rx) / 2, groundY + 18, 'Zip Line', {
      fontSize: '11px', color: '#3a2000', stroke: '#ffffffaa', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
  }

  private drawDrawbridge(): void {
    const g = this.add.graphics();
    const x = this.DRAWBRIDGE_X;
    const topY = GAME_HEIGHT / 2 - 30;
    const groundY = GAME_HEIGHT / 2 + 60;
    const towerW = 20;
    const towerH = 80;
    const gap = 80;

    // Left tower (blue)
    g.fillStyle(0x3498db);
    g.fillRect(x - gap / 2 - towerW, topY, towerW, towerH);
    // Right tower
    g.fillRect(x + gap / 2, topY, towerW, towerH);

    // Battlements
    g.fillStyle(0x2980b9);
    for (let bx = x - gap / 2 - towerW; bx < x - gap / 2; bx += 8) {
      g.fillRect(bx, topY - 8, 5, 10);
    }
    for (let bx = x + gap / 2; bx < x + gap / 2 + towerW; bx += 8) {
      g.fillRect(bx, topY - 8, 5, 10);
    }

    // Bridge plank (drawn as a separate graphics object so we can animate it)
    if (!this.bridgePlank) {
      this.bridgePlank = this.add.graphics();
    }
    this.redrawBridgePlank(0);

    // Label
    this.add.text(x, groundY + 18, 'Drawbridge', {
      fontSize: '11px', color: '#3a2000', stroke: '#ffffffaa', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
  }

  private redrawBridgePlank(angle: number): void {
    if (!this.bridgePlank) return;
    this.bridgePlank.clear();
    const x = this.DRAWBRIDGE_X;
    const pivotX = x - 40; // left edge of bridge
    const pivotY = GAME_HEIGHT / 2 + 10;
    const bridgeLen = 80;
    const bridgeH = 10;

    this.bridgePlank.fillStyle(0x8b5e3c);
    // Rotate around pivot
    const rad = Phaser.Math.DegToRad(angle);
    const ex = pivotX + Math.cos(rad) * bridgeLen;
    const ey = pivotY + Math.sin(rad) * bridgeLen;

    // Draw as a thick line (rectangle rotated)
    this.bridgePlank.fillTriangle(
      pivotX, pivotY - bridgeH / 2,
      pivotX, pivotY + bridgeH / 2,
      ex, ey + bridgeH / 2
    );
    this.bridgePlank.fillTriangle(
      pivotX, pivotY - bridgeH / 2,
      ex, ey - bridgeH / 2,
      ex, ey + bridgeH / 2
    );
    this.bridgePlank.setDepth(3);
  }

  // ─── Characters ──────────────────────────────────────────────────────────────

  private createCharacters(): void {
    const state = SaveManager.load();
    // Place both characters below the monkey bars area to start
    this.playerContainer = CharacterRenderer.create(
      this, this.MONKEY_BARS_X, GAME_HEIGHT / 2 + 50, state.dadConfig, 1.5
    );
    this.companionContainer = CharacterRenderer.create(
      this, this.MONKEY_BARS_X + 50, GAME_HEIGHT / 2 + 55, state.lillianConfig, 1.5
    );
    this.playerContainer.setDepth(10);
    this.companionContainer.setDepth(9);
  }

  // ─── Interactions ─────────────────────────────────────────────────────────────

  private setupInteractions(): void {
    // Invisible interactive hit zones for each equipment
    this.addEquipmentButton(
      this.MONKEY_BARS_X, GAME_HEIGHT / 2 - 20, 120, 140,
      () => this.doMonkeyBars()
    );
    this.addEquipmentButton(
      this.SLIDE_X + 20, GAME_HEIGHT / 2 - 30, 120, 120,
      () => this.doSlide()
    );
    this.addEquipmentButton(
      this.CLIMB_WALL_X, GAME_HEIGHT / 2 - 40, 80, 140,
      () => this.doClimbWall()
    );
    this.addEquipmentButton(
      this.ZIP_LINE_X - 20, GAME_HEIGHT / 2 - 70, 150, 110,
      () => this.doZipLine()
    );
    this.addEquipmentButton(
      this.DRAWBRIDGE_X, GAME_HEIGHT / 2 + 20, 120, 80,
      () => this.doDrawbridge()
    );
  }

  private addEquipmentButton(
    cx: number, cy: number, w: number, h: number, cb: () => void
  ): void {
    const zone = this.add.zone(cx, cy, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    zone.on('pointerdown', () => {
      if (!this.busy) cb();
    });
    // Subtle hover highlight
    zone.on('pointerover', () => {
      const hi = this.add.graphics().setDepth(2);
      hi.lineStyle(2, 0xffffff, 0.4);
      hi.strokeRect(cx - w / 2, cy - h / 2, w, h);
      zone.setData('highlight', hi);
    });
    zone.on('pointerout', () => {
      const hi = zone.getData('highlight') as Phaser.GameObjects.Graphics | undefined;
      if (hi) { hi.destroy(); zone.setData('highlight', null); }
    });
  }

  // ─── Activity: Monkey Bars ───────────────────────────────────────────────────

  private doMonkeyBars(): void {
    this.busy = true;
    const startX = this.MONKEY_BARS_X - 48;
    const endX = this.MONKEY_BARS_X + 48;
    const swingY = GAME_HEIGHT / 2 - 30;

    // Walk to start
    this.tweens.add({
      targets: this.playerContainer,
      x: startX, y: GAME_HEIGHT / 2 + 50,
      duration: 500, ease: 'Linear',
      onComplete: () => {
        // Lift up to bar height
        this.tweens.add({
          targets: this.playerContainer,
          y: swingY, duration: 300, ease: 'Back.Out',
          onComplete: () => {
            // Swing across with arc
            this.tweens.add({
              targets: this.playerContainer,
              x: endX,
              duration: 1200,
              ease: 'Sine.InOut',
              onUpdate: (tween) => {
                const progress = tween.progress;
                const arc = Math.sin(progress * Math.PI) * -15;
                this.playerContainer.y = swingY + arc;
              },
              onComplete: () => {
                // Drop down
                this.tweens.add({
                  targets: this.playerContainer,
                  y: GAME_HEIGHT / 2 + 50, duration: 250, ease: 'Bounce.Out',
                  onComplete: () => {
                    this.showSpeech(this.playerContainer, 'Woohoo!');
                    this.time.delayedCall(1200, () => { this.busy = false; });
                  },
                });
              },
            });
          },
        });
      },
    });
  }

  // ─── Activity: Slide ────────────────────────────────────────────────────────

  private doSlide(): void {
    this.busy = true;
    const platformX = this.SLIDE_X;
    const platformY = GAME_HEIGHT / 2 - 60;
    const slideEndX = this.SLIDE_X + 90;
    const slideEndY = GAME_HEIGHT / 2 + 30;

    // Walk to base
    this.tweens.add({
      targets: this.playerContainer,
      x: platformX, y: GAME_HEIGHT / 2 + 50, duration: 400, ease: 'Linear',
      onComplete: () => {
        // Climb up (tween to top)
        this.tweens.add({
          targets: this.playerContainer,
          x: platformX, y: platformY, duration: 600, ease: 'Linear',
          onComplete: () => {
            this.showSpeech(this.playerContainer, 'Whee!');
            // Slide down diagonally
            this.tweens.add({
              targets: this.playerContainer,
              x: slideEndX, y: slideEndY, duration: 700, ease: 'Quad.In',
              onComplete: () => {
                this.time.delayedCall(800, () => { this.busy = false; });
              },
            });
          },
        });
      },
    });
  }

  // ─── Activity: Rock Climbing Wall ───────────────────────────────────────────

  private doClimbWall(): void {
    this.busy = true;
    const wallX = this.CLIMB_WALL_X;
    const wallTop = GAME_HEIGHT / 2 - 95;
    const wallBot = GAME_HEIGHT / 2 + 30;

    // Walk to base
    this.tweens.add({
      targets: this.playerContainer,
      x: wallX, y: wallBot, duration: 400, ease: 'Linear',
      onComplete: () => {
        // Climb up with slight wobble
        this.tweens.add({
          targets: this.playerContainer,
          y: wallTop, duration: 1000, ease: 'Linear',
          onUpdate: (tween) => {
            const wobble = Math.sin(tween.progress * Math.PI * 6) * 4;
            this.playerContainer.x = wallX + wobble;
          },
          onComplete: () => {
            // Raise arms
            this.showSpeech(this.playerContainer, 'I made it!');
            this.tweens.add({
              targets: this.playerContainer,
              scaleX: { from: 1, to: 1.15 }, scaleY: { from: 1, to: 1.15 },
              yoyo: true, duration: 300,
              onComplete: () => {
                // Climb back down
                this.time.delayedCall(600, () => {
                  this.tweens.add({
                    targets: this.playerContainer,
                    x: wallX, y: GAME_HEIGHT / 2 + 50, duration: 600, ease: 'Linear',
                    onComplete: () => {
                      this.busy = false;
                    },
                  });
                });
              },
            });
          },
        });
      },
    });
  }

  // ─── Activity: Zip Line ─────────────────────────────────────────────────────

  private doZipLine(): void {
    this.busy = true;
    const lx = this.ZIP_LINE_X - 80;
    const ly = GAME_HEIGHT / 2 - 110;
    const rx = this.ZIP_LINE_X + 50;
    const ry = GAME_HEIGHT / 2 - 20;

    // Walk to left pole
    this.tweens.add({
      targets: this.playerContainer,
      x: lx, y: GAME_HEIGHT / 2 + 20, duration: 400, ease: 'Linear',
      onComplete: () => {
        // Rise up to cable
        this.tweens.add({
          targets: this.playerContainer,
          y: ly, duration: 300, ease: 'Back.Out',
          onComplete: () => {
            MusicManager.sfx('wind');
            this.showSpeech(this.playerContainer, 'Wheee!');
            // Ride zip line
            this.tweens.add({
              targets: this.playerContainer,
              x: rx, y: ry, duration: 900, ease: 'Quad.In',
              onComplete: () => {
                // Drop to ground
                this.tweens.add({
                  targets: this.playerContainer,
                  y: GAME_HEIGHT / 2 + 50, duration: 250, ease: 'Bounce.Out',
                  onComplete: () => {
                    this.time.delayedCall(600, () => { this.busy = false; });
                  },
                });
              },
            });
          },
        });
      },
    });
  }

  // ─── Activity: Drawbridge ───────────────────────────────────────────────────

  private doDrawbridge(): void {
    if (this.bridgeAnimating) return;
    this.busy = true;
    this.bridgeAnimating = true;

    // Walk to drawbridge
    this.tweens.add({
      targets: this.playerContainer,
      x: this.DRAWBRIDGE_X - 60, y: GAME_HEIGHT / 2 + 50, duration: 400, ease: 'Linear',
      onComplete: () => {
        this.showSpeech(this.playerContainer, this.bridgeRaised ? 'Lower it!' : 'Raise it!');

        const targetAngle = this.bridgeRaised ? 0 : -60;
        const startAngle = this.bridgeRaised ? -60 : 0;
        // Animate bridge plank
        const obj = { angle: startAngle };
        this.tweens.add({
          targets: obj,
          angle: targetAngle,
          duration: 800,
          ease: 'Sine.InOut',
          onUpdate: () => this.redrawBridgePlank(obj.angle),
          onComplete: () => {
            this.bridgeRaised = !this.bridgeRaised;
            this.bridgeAnimating = false;

            // Character waves
            this.tweens.add({
              targets: this.playerContainer,
              x: this.playerContainer.x + 10,
              yoyo: true, repeat: 2, duration: 150,
              onComplete: () => {
                this.time.delayedCall(400, () => { this.busy = false; });
              },
            });
          },
        });
      },
    });
  }

  // ─── Speech Bubble ───────────────────────────────────────────────────────────

  private showSpeech(target: Phaser.GameObjects.Container, text: string): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    this.speechBubble = this.makeBubble(target.x, target.y - 50, text, 0xffffff);
    this.time.delayedCall(1400, () => {
      if (this.speechBubble) {
        this.speechBubble.destroy();
        this.speechBubble = null;
      }
    });
  }

  private makeBubble(
    x: number, y: number, text: string, bgColor: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(50);
    const label = this.add.text(0, 0, text, {
      fontSize: '14px', color: '#1a1a2e',
    }).setOrigin(0.5);
    const tw = label.width + 18;
    const th = label.height + 10;
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 0.95);
    bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 8);
    bg.fillTriangle(-6, th / 2, 6, th / 2, 0, th / 2 + 8);
    container.add([bg, label]);
    return container;
  }

  // ─── Companion Cheering ───────────────────────────────────────────────────────

  private startCompanionCheering(): void {
    const cheers = ['Yay!', 'Go!', 'Amazing!', 'So cool!', 'Wow!'];
    this.companionBubbleTimer = this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => {
        if (this.companionBubble) {
          this.companionBubble.destroy();
          this.companionBubble = null;
        }
        const cheer = cheers[Math.floor(Math.random() * cheers.length)];
        this.companionBubble = this.makeBubble(
          this.companionContainer.x,
          this.companionContainer.y - 50,
          cheer,
          0xfffde7
        );
        this.time.delayedCall(2000, () => {
          if (this.companionBubble) {
            this.companionBubble.destroy();
            this.companionBubble = null;
          }
        });
      },
    });
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  private createUI(): void {
    const homeBtn = this.add.text(GAME_WIDTH / 2, 28, '⌂ Home', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#2c3e50cc',
      padding: { x: 14, y: 7 },
    })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });

    homeBtn.on('pointerdown', () => {
      if (this.companionBubbleTimer) this.companionBubbleTimer.remove();
      MusicManager.sfx('select');
      SceneTransition.switchScene(this, SCENE_KEYS.HUB, {
        returnX: this.sceneData.returnX,
        returnY: this.sceneData.returnY,
      });
    });

    homeBtn.on('pointerover', () => homeBtn.setBackgroundColor('#3498db'));
    homeBtn.on('pointerout', () => homeBtn.setBackgroundColor('#2c3e50cc'));
  }

  // ─── Update: keep companion nearby ──────────────────────────────────────────

  update(): void {
    // Companion lazily follows player
    if (!this.busy) {
      const cx = this.companionContainer.x;
      const cy = this.companionContainer.y;
      const tx = this.playerContainer.x + 55;
      const ty = this.playerContainer.y + 5;
      this.companionContainer.setPosition(
        cx + (tx - cx) * 0.04,
        cy + (ty - cy) * 0.04
      );
    }

    // Keep speech bubbles anchored to their targets
    if (this.speechBubble) {
      this.speechBubble.setPosition(
        this.playerContainer.x,
        this.playerContainer.y - 50
      );
    }
    if (this.companionBubble) {
      this.companionBubble.setPosition(
        this.companionContainer.x,
        this.companionContainer.y - 50
      );
    }
  }
}
