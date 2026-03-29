import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';
import { MusicManager } from '../systems/MusicManager';

const WORLD_W = 1100;
const GROUND_Y = GAME_HEIGHT - 120;

// Equipment definitions — x is world-space center
const EQUIPMENT = [
  { key: 'monkey_bars', label: 'Monkey Bars', x: 130, hint: 'Tap to swing across!' },
  { key: 'slide',       label: 'Slide',       x: 320, hint: 'Tap to slide down!' },
  { key: 'climb_wall',  label: 'Climbing Wall', x: 510, hint: 'Tap to climb!' },
  { key: 'zip_line',    label: 'Zip Line',    x: 720, hint: 'Tap to zip!' },
  { key: 'drawbridge',  label: 'Drawbridge',  x: 930, hint: 'Tap to raise/lower!' },
];

export class PlaygroundScene extends Phaser.Scene {
  protected sceneData: { returnX?: number; returnY?: number } = {};

  private playerContainer!: Phaser.GameObjects.Container;
  private companionContainer!: Phaser.GameObjects.Container;
  private activeCharacter: 'dad' | 'lillian' = 'dad';
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private companionBubble: Phaser.GameObjects.Container | null = null;
  private companionBubbleTimer: Phaser.Time.TimerEvent | null = null;
  private hintText!: Phaser.GameObjects.Text;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private bridgeRaised = false;
  private bridgePlank: Phaser.GameObjects.Graphics | null = null;
  private bridgeCx = 930; // updated when drawbridge is drawn
  private bridgeAnimating = false;
  private busy = false;
  private pickerShown = false;

  constructor() {
    super({ key: 'PlaygroundScene' });
  }

  create(data?: { returnX?: number; returnY?: number; activeCharacter?: 'dad' | 'lillian' }): void {
    this.sceneData = { returnX: data?.returnX, returnY: data?.returnY };
    this.activeCharacter = data?.activeCharacter ?? 'dad';
    this.busy = false;
    this.bridgeRaised = false;
    this.bridgeAnimating = false;
    this.speechBubble = null;
    this.companionBubble = null;
    this.pickerShown = false;

    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);

    SceneTransition.fadeIn(this, 300);
    MusicManager.resume();
    MusicManager.playTheme('hub');

    this.drawBackground();
    this.drawEquipment();
    this.createCharacters();
    this.setupKeyboard();
    this.setupInteractions();
    this.createUI();

    if (data?.activeCharacter === undefined) {
      this.showCharacterPicker();
    }
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();

    // Sky
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb0e8ff, 0xb0e8ff, 1);
    g.fillRect(0, 0, WORLD_W, GROUND_Y);

    // Clouds
    const cloudDefs = [
      { x: 80, y: 70, s: 0.9 }, { x: 260, y: 45, s: 1.1 },
      { x: 480, y: 80, s: 0.8 }, { x: 650, y: 50, s: 1.0 },
      { x: 850, y: 75, s: 0.85 }, { x: 1000, y: 40, s: 0.95 },
    ];
    cloudDefs.forEach(({ x, y, s }) => this.drawCloud(g, x, y, s));

    // Grass
    g.fillStyle(0x5aad3a);
    g.fillRect(0, GROUND_Y, WORLD_W, GAME_HEIGHT - GROUND_Y);

    // Darker grass strip at top of ground
    g.fillStyle(0x4a9a2a);
    g.fillRect(0, GROUND_Y, WORLD_W, 12);

    // Safety surface (tan rubber) under equipment area
    g.fillStyle(0xc8a050, 0.55);
    g.fillRoundedRect(30, GROUND_Y - 100, WORLD_W - 60, 110, 8);

    // Fence at far edges
    g.fillStyle(0xaaaaaa);
    for (let fx = 0; fx < WORLD_W; fx += 30) {
      g.fillRect(fx, GROUND_Y - 130, 4, 130);
    }
    g.fillRect(0, GROUND_Y - 130, WORLD_W, 5);
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, 22 * scale);
    g.fillCircle(x + 20 * scale, y - 8 * scale, 18 * scale);
    g.fillCircle(x + 38 * scale, y, 20 * scale);
    g.fillCircle(x + 18 * scale, y + 6 * scale, 22 * scale);
  }

  // ─── Equipment Drawing ───────────────────────────────────────────────────────

  private drawEquipment(): void {
    this.drawMonkeyBars(EQUIPMENT[0].x);
    this.drawSlide(EQUIPMENT[1].x);
    this.drawRockClimbingWall(EQUIPMENT[2].x);
    this.drawZipLine(EQUIPMENT[3].x);
    this.drawDrawbridge(EQUIPMENT[4].x);

    // Labels with tap-to-play hints
    EQUIPMENT.forEach(eq => {
      this.add.text(eq.x, GROUND_Y + 18, eq.label, {
        fontSize: '12px', color: '#ffffff',
        stroke: '#336600', strokeThickness: 3,
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5);

      // Pulsing tap indicator above each piece
      const dot = this.add.text(eq.x, GROUND_Y - 130, '▼ Tap', {
        fontSize: '11px', color: '#ffe066',
        stroke: '#333300', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(6);
      this.tweens.add({ targets: dot, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
    });
  }

  private drawMonkeyBars(cx: number): void {
    const g = this.add.graphics().setDepth(3);
    const topY = GROUND_Y - 160;
    const botY = GROUND_Y;
    const halfW = 60;

    // Side poles
    g.fillStyle(0xe8b800);
    g.fillRect(cx - halfW - 6, topY, 10, botY - topY);
    g.fillRect(cx + halfW - 4, topY, 10, botY - topY);

    // Top rail
    g.fillStyle(0xf1c40f);
    g.fillRect(cx - halfW - 6, topY - 10, halfW * 2 + 20, 10);

    // Rungs
    g.fillStyle(0xf1c40f);
    for (let ry = topY + 10; ry < topY + 90; ry += 20) {
      g.fillRect(cx - halfW, ry, halfW * 2, 8);
    }

    // Shading
    g.fillStyle(0xc8960a, 0.4);
    g.fillRect(cx - halfW + 2, topY + 10, 4, 80);
  }

  private drawSlide(cx: number): void {
    const g = this.add.graphics().setDepth(3);
    const platformTopY = GROUND_Y - 170;
    const platformBotY = GROUND_Y - 90;

    // Platform tower (blue)
    g.fillStyle(0x2980b9);
    g.fillRect(cx - 28, platformTopY, 56, platformBotY - platformTopY);

    // Platform surface
    g.fillStyle(0x3498db);
    g.fillRect(cx - 32, platformTopY - 10, 64, 14);

    // Ladder
    g.fillStyle(0x1a6a9a);
    g.fillRect(cx - 26, platformTopY, 8, platformBotY - platformTopY);
    g.fillRect(cx - 14, platformTopY, 8, platformBotY - platformTopY);
    for (let ly = platformTopY + 14; ly < platformBotY; ly += 18) {
      g.fillRect(cx - 26, ly, 20, 5);
    }

    // Slide ramp (pink)
    const slideEndX = cx + 100;
    const slideEndY = GROUND_Y - 5;
    g.fillStyle(0xff69b4);
    g.fillTriangle(cx + 24, platformTopY + 6, cx + 38, platformTopY + 6, slideEndX + 14, slideEndY);
    g.fillTriangle(cx + 24, platformTopY + 6, slideEndX, slideEndY, slideEndX + 14, slideEndY);

    // Slide sides
    g.fillStyle(0xcc3388, 0.5);
    g.fillRect(cx + 22, platformTopY + 2, 6, 20);
  }

  private drawRockClimbingWall(cx: number): void {
    const g = this.add.graphics().setDepth(3);
    const topY = GROUND_Y - 175;
    const botY = GROUND_Y;
    const wallW = 70;

    // Wall (gray with slight lean)
    g.fillStyle(0x7f8c8d);
    g.fillRect(cx - wallW / 2, topY, wallW, botY - topY);

    // Wall shading
    g.fillStyle(0x95a5a6);
    g.fillRect(cx - wallW / 2, topY, wallW / 3, botY - topY);

    // Colorful holds
    const holdColors = [0x3498db, 0xff69b4, 0xf1c40f, 0xe74c3c, 0x2ecc71, 0x9b59b6];
    const holdPos: [number, number][] = [
      [-22, 20], [12, 38], [-8, 58], [18, 75], [-20, 95],
      [6, 115], [-25, 135], [14, 152], [-4, 168],
    ];
    holdPos.forEach(([hx, hy], i) => {
      g.fillStyle(holdColors[i % holdColors.length]);
      g.fillCircle(cx + hx, topY + hy, 6);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(cx + hx - 2, topY + hy - 2, 2);
    });
  }

  private drawZipLine(cx: number): void {
    const g = this.add.graphics().setDepth(3);
    const lx = cx - 90;
    const ly = GROUND_Y - 190;
    const rx = cx + 90;
    const ry = GROUND_Y - 70;

    // Poles
    g.fillStyle(0xe8b800);
    g.fillRect(lx - 6, ly, 12, GROUND_Y - ly);
    g.fillRect(rx - 6, ry, 12, GROUND_Y - ry);

    // Cable
    g.lineStyle(4, 0x888888, 1);
    g.lineBetween(lx, ly + 8, rx, ry + 8);

    // Handle
    g.fillStyle(0xff69b4);
    g.fillRect(lx + 8, ly + 4, 22, 8);
    g.fillStyle(0xdd3399);
    g.fillRect(lx + 16, ly + 12, 6, 14);

    // Top platform on tall pole
    g.fillStyle(0xf1c40f);
    g.fillRect(lx - 20, ly - 8, 52, 10);
  }

  private drawDrawbridge(cx: number): void {
    const g = this.add.graphics().setDepth(3);
    const topY = GROUND_Y - 160;
    const towerH = 120;
    const towerW = 24;
    const gap = 90;

    // Left tower
    g.fillStyle(0x2980b9);
    g.fillRect(cx - gap / 2 - towerW, topY, towerW, towerH);
    g.fillStyle(0x3498db);
    g.fillRect(cx - gap / 2 - towerW, topY, towerW / 2, towerH);

    // Right tower
    g.fillStyle(0x2980b9);
    g.fillRect(cx + gap / 2, topY, towerW, towerH);

    // Battlements
    g.fillStyle(0x1f6da8);
    for (let bx = cx - gap / 2 - towerW; bx < cx - gap / 2; bx += 9) {
      g.fillRect(bx, topY - 12, 6, 14);
    }
    for (let bx = cx + gap / 2; bx < cx + gap / 2 + towerW; bx += 9) {
      g.fillRect(bx, topY - 12, 6, 14);
    }

    // Chains
    g.lineStyle(2, 0xaaaaaa, 1);
    g.lineBetween(cx - gap / 2 - towerW / 2, topY + 20, cx - gap / 2, GROUND_Y - 10);
    g.lineBetween(cx + gap / 2 + towerW / 2, topY + 20, cx + gap / 2, GROUND_Y - 10);

    // Bridge plank (separate graphics for animation)
    if (!this.bridgePlank) {
      this.bridgePlank = this.add.graphics().setDepth(4);
    }
    this.redrawBridgePlank(cx, 0);
  }

  private redrawBridgePlank(cx: number, angleDeg: number): void {
    if (!this.bridgePlank) return;
    this.bridgePlank.clear();
    const gap = 90;
    const pivotX = cx - gap / 2;
    const pivotY = GROUND_Y - 8;
    const len = gap;
    const rad = Phaser.Math.DegToRad(angleDeg);
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const endX = pivotX + cosA * len;
    const endY = pivotY + sinA * len;

    // Perpendicular offset for plank thickness
    const halfT = 7;
    const ox = -sinA * halfT;
    const oy =  cosA * halfT;

    // Main plank body (proper rotated rectangle)
    this.bridgePlank.fillStyle(0x8b5e3c);
    this.bridgePlank.fillPoints([
      { x: pivotX + ox, y: pivotY + oy },
      { x: pivotX - ox, y: pivotY - oy },
      { x: endX   - ox, y: endY   - oy },
      { x: endX   + ox, y: endY   + oy },
    ], true);

    // Wood plank lines across the bridge
    this.bridgePlank.lineStyle(1, 0x5a3010, 0.6);
    for (let pi = 1; pi < 6; pi++) {
      const t = pi / 6;
      const bx = pivotX + cosA * len * t;
      const by = pivotY + sinA * len * t;
      this.bridgePlank.lineBetween(bx + ox * 0.85, by + oy * 0.85, bx - ox * 0.85, by - oy * 0.85);
    }
  }

  // ─── Character Picker ────────────────────────────────────────────────────────

  private showCharacterPicker(): void {
    this.pickerShown = false;
    const state = SaveManager.load();
    const overlay = this.add.graphics().setScrollFactor(0).setDepth(100);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 'Who\'s playing?', {
      fontSize: '26px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    const makeBtn = (lbl: string, subLbl: string, bx: number, who: 'dad' | 'lillian'): void => {
      const bg = this.add.graphics().setScrollFactor(0).setDepth(101);
      bg.fillStyle(who === 'dad' ? 0x3498db : 0xff69b4, 0.9);
      bg.fillRoundedRect(bx - 80, GAME_HEIGHT * 0.42, 160, 80, 12);
      this.add.text(bx, GAME_HEIGHT * 0.46, lbl, {
        fontSize: '20px', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
      this.add.text(bx, GAME_HEIGHT * 0.53, subLbl, {
        fontSize: '13px', color: '#ffffffcc',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
      const zone = this.add.zone(bx, GAME_HEIGHT * 0.46 + 20, 160, 80)
        .setScrollFactor(0).setDepth(103).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (this.pickerShown) return;
        this.pickerShown = true;
        this.activeCharacter = who;
        overlay.destroy();
        // destroy all picker objects via depth sweep is complex — use scene restart trick
        this.scene.restart({ ...this.sceneData, activeCharacter: who });
      });
    };

    makeBtn(state.dadConfig.name || 'Dad', 'Dad', GAME_WIDTH / 2 - 95, 'dad');
    makeBtn(state.lillianConfig.name || 'Lillian', 'Lillian', GAME_WIDTH / 2 + 95, 'lillian');
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────────

  private setupKeyboard(): void {
    if (this.input.keyboard) {
      this.keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.keyA     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }
  }

  // ─── Characters ──────────────────────────────────────────────────────────────

  private createCharacters(): void {
    const state = SaveManager.load();
    const playerCfg = this.activeCharacter === 'dad' ? state.dadConfig : state.lillianConfig;
    const companionCfg = this.activeCharacter === 'dad' ? state.lillianConfig : state.dadConfig;
    this.playerContainer = CharacterRenderer.create(this, 60, GROUND_Y - 10, playerCfg, 1.5);
    this.companionContainer = CharacterRenderer.create(this, 110, GROUND_Y - 5, companionCfg, 1.5);
    this.playerContainer.setDepth(10);
    this.companionContainer.setDepth(9);
    // Camera follows player (only after picker chosen, i.e. activeCharacter is set)
    if (this.activeCharacter) {
      this.cameras.main.startFollow(this.playerContainer, true, 0.08, 0.08);
      this.startCompanionCheering();
    }
  }

  // ─── Interactions ─────────────────────────────────────────────────────────────

  private setupInteractions(): void {
    EQUIPMENT.forEach(eq => {
      const zone = this.add.zone(eq.x, GROUND_Y - 80, 160, 220)
        .setInteractive({ useHandCursor: true })
        .setDepth(20);
      zone.on('pointerdown', () => {
        if (!this.busy) this.startActivity(eq.key, eq.x);
      });
    });
  }

  private startActivity(key: string, equipX: number): void {
    this.busy = true;

    // Walk player to equipment first
    const walkDuration = Math.abs(this.playerContainer.x - equipX) * 2.5;
    this.tweens.add({
      targets: this.playerContainer,
      x: equipX,
      duration: Math.max(300, Math.min(walkDuration, 900)),
      ease: 'Linear',
      onComplete: () => {
        switch (key) {
          case 'monkey_bars': this.doMonkeyBars(equipX); break;
          case 'slide':       this.doSlide(equipX); break;
          case 'climb_wall':  this.doClimbWall(equipX); break;
          case 'zip_line':    this.doZipLine(equipX); break;
          case 'drawbridge':  this.doDrawbridge(equipX); break;
        }
      },
    });
  }

  // ─── Activity: Monkey Bars ───────────────────────────────────────────────────

  private doMonkeyBars(cx: number): void {
    const startX = cx - 60;
    const endX = cx + 60;
    const barY = GROUND_Y - 130;

    this.playerContainer.setPosition(startX, GROUND_Y - 10);

    // Jump up to bar
    this.tweens.add({
      targets: this.playerContainer, y: barY,
      duration: 300, ease: 'Back.Out',
      onComplete: () => {
        // Swing across rungs
        this.tweens.add({
          targets: this.playerContainer, x: endX,
          duration: 1400, ease: 'Sine.InOut',
          onUpdate: (tween) => {
            const arc = Math.sin(tween.progress * Math.PI * 3) * 12;
            this.playerContainer.y = barY + arc;
          },
          onComplete: () => {
            this.showSpeech(this.playerContainer, 'Woohoo!');
            this.tweens.add({
              targets: this.playerContainer, y: GROUND_Y - 10,
              duration: 250, ease: 'Bounce.Out',
              onComplete: () => { this.time.delayedCall(900, () => { this.busy = false; }); },
            });
          },
        });
      },
    });
  }

  // ─── Activity: Slide ────────────────────────────────────────────────────────

  private doSlide(cx: number): void {
    const ladderX = cx - 14;
    const platformY = GROUND_Y - 160;
    const slideEndX = cx + 100;

    this.playerContainer.setPosition(ladderX, GROUND_Y - 10);

    // Climb ladder
    this.tweens.add({
      targets: this.playerContainer, y: platformY,
      duration: 700, ease: 'Linear',
      onUpdate: (tween) => {
        const wobble = Math.sin(tween.progress * Math.PI * 8) * 3;
        this.playerContainer.x = ladderX + wobble;
      },
      onComplete: () => {
        this.showSpeech(this.playerContainer, 'Wheeee!');
        // Slide diagonally down the ramp
        this.tweens.add({
          targets: this.playerContainer,
          x: slideEndX, y: GROUND_Y - 10,
          duration: 700, ease: 'Quad.In',
          onComplete: () => {
            this.time.delayedCall(700, () => { this.busy = false; });
          },
        });
      },
    });
  }

  // ─── Activity: Rock Climbing Wall ───────────────────────────────────────────

  private doClimbWall(cx: number): void {
    const wallTop = GROUND_Y - 168;

    this.playerContainer.setPosition(cx, GROUND_Y - 10);

    // Climb up with wobble
    this.tweens.add({
      targets: this.playerContainer, y: wallTop,
      duration: 1200, ease: 'Linear',
      onUpdate: (tween) => {
        const wobble = Math.sin(tween.progress * Math.PI * 8) * 5;
        this.playerContainer.x = cx + wobble;
      },
      onComplete: () => {
        this.showSpeech(this.playerContainer, 'I made it!');
        // Victory wiggle
        this.tweens.add({
          targets: this.playerContainer, scaleX: 1.2, scaleY: 0.85,
          yoyo: true, repeat: 2, duration: 200,
          onComplete: () => {
            this.time.delayedCall(400, () => {
              this.tweens.add({
                targets: this.playerContainer, x: cx, y: GROUND_Y - 10,
                duration: 700, ease: 'Linear',
                onComplete: () => { this.busy = false; },
              });
            });
          },
        });
      },
    });
  }

  // ─── Activity: Zip Line ─────────────────────────────────────────────────────

  private doZipLine(cx: number): void {
    const lx = cx - 90;
    const cableStartY = GROUND_Y - 190 + 8; // cable height at left pole
    const cableEndY   = GROUND_Y - 70 + 8;  // cable height at right pole
    const rx = cx + 90;
    // Hang character below cable — offset by ~35px below cable
    const hangOffset = 35;
    const hangStartY = cableStartY + hangOffset;
    const hangEndY   = cableEndY + hangOffset;

    this.playerContainer.setPosition(lx, GROUND_Y - 10);

    // Walk to pole base, then rise up
    this.tweens.add({
      targets: this.playerContainer, y: hangStartY,
      duration: 400, ease: 'Back.Out',
      onComplete: () => {
        MusicManager.sfx('wind');
        this.showSpeech(this.playerContainer, 'Wheee!');
        // Zip along cable, hanging below it
        this.tweens.add({
          targets: this.playerContainer, x: rx, y: hangEndY,
          duration: 900, ease: 'Quad.In',
          onComplete: () => {
            this.tweens.add({
              targets: this.playerContainer, y: GROUND_Y - 10,
              duration: 220, ease: 'Bounce.Out',
              onComplete: () => { this.time.delayedCall(500, () => { this.busy = false; }); },
            });
          },
        });
      },
    });
  }

  // ─── Activity: Drawbridge ───────────────────────────────────────────────────

  private doDrawbridge(cx: number): void {
    if (this.bridgeAnimating) { this.busy = false; return; }
    this.bridgeAnimating = true;

    const gap = 90;
    const towerW = 24;
    // Stand just to the left of the left tower
    const standX = cx - gap / 2 - towerW - 18;
    this.playerContainer.setPosition(standX, GROUND_Y - 10);

    const willRaise = !this.bridgeRaised;
    this.showSpeech(this.playerContainer, willRaise ? 'Raise it!' : 'Lower it!');

    const startAngle = this.bridgeRaised ? -55 : 0;
    const endAngle   = this.bridgeRaised ? 0 : -55;
    const obj = { angle: startAngle };
    this.tweens.add({
      targets: obj, angle: endAngle,
      duration: 900, ease: 'Sine.InOut',
      onUpdate: () => this.redrawBridgePlank(cx, obj.angle),
      onComplete: () => {
        this.bridgeRaised = !this.bridgeRaised;
        this.bridgeAnimating = false;

        if (!this.bridgeRaised) {
          // Bridge just lowered — walk across!
          const crossEndX = cx + gap / 2 + towerW + 18;
          this.time.delayedCall(150, () => {
            this.showSpeech(this.playerContainer, 'I crossed it!');
            this.tweens.add({
              targets: this.playerContainer, x: crossEndX,
              duration: 700, ease: 'Linear',
              onComplete: () => {
                this.time.delayedCall(500, () => {
                  this.tweens.add({
                    targets: this.playerContainer, x: standX,
                    duration: 700, ease: 'Linear',
                    onComplete: () => { this.busy = false; },
                  });
                });
              },
            });
          });
        } else {
          // Bridge raised — celebrate with a little bounce
          this.tweens.add({
            targets: this.playerContainer, y: GROUND_Y - 30,
            yoyo: true, duration: 180,
            onComplete: () => { this.time.delayedCall(300, () => { this.busy = false; }); },
          });
        }
      },
    });
  }

  // ─── Speech Bubble ───────────────────────────────────────────────────────────

  private showSpeech(target: Phaser.GameObjects.Container, text: string): void {
    if (this.speechBubble) { this.speechBubble.destroy(); this.speechBubble = null; }
    this.speechBubble = this.makeBubble(target.x, target.y - 55, text, 0xffffff);
    this.time.delayedCall(1600, () => {
      if (this.speechBubble) { this.speechBubble.destroy(); this.speechBubble = null; }
    });
  }

  private makeBubble(x: number, y: number, text: string, bgColor: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(50);
    const label = this.add.text(0, 0, text, { fontSize: '14px', color: '#1a1a2e' }).setOrigin(0.5);
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
    const cheers = ['Yay!', 'Go!', 'Amazing!', 'So cool!', 'Wow!', 'You got it!'];
    this.companionBubbleTimer = this.time.addEvent({
      delay: 3800,
      loop: true,
      callback: () => {
        if (this.companionBubble) { this.companionBubble.destroy(); this.companionBubble = null; }
        const cheer = cheers[Math.floor(Math.random() * cheers.length)];
        this.companionBubble = this.makeBubble(
          this.companionContainer.x, this.companionContainer.y - 55, cheer, 0xfffde7
        );
        this.time.delayedCall(2200, () => {
          if (this.companionBubble) { this.companionBubble.destroy(); this.companionBubble = null; }
        });
      },
    });
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  private createUI(): void {
    // Hint text (fixed to camera)
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, 'Tap any equipment to play!', {
      fontSize: '13px', color: '#ffe066',
      stroke: '#333300', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    const homeBtn = this.add.text(GAME_WIDTH / 2, 28, '⌂ Home', {
      fontSize: '18px', color: '#ffffff',
      backgroundColor: '#2c3e50cc', padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });

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

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    // Keyboard walk when not doing an activity
    if (!this.busy && this.activeCharacter) {
      const speed = 180 * (delta / 1000);
      if (this.keyLeft?.isDown || this.keyA?.isDown) {
        this.playerContainer.x = Phaser.Math.Clamp(this.playerContainer.x - speed, 20, WORLD_W - 20);
        this.playerContainer.setScale(-1.5, 1.5);
      }
      if (this.keyRight?.isDown || this.keyD?.isDown) {
        this.playerContainer.x = Phaser.Math.Clamp(this.playerContainer.x + speed, 20, WORLD_W - 20);
        this.playerContainer.setScale(1.5, 1.5);
      }
    }

    // Companion lazily follows player when not busy
    if (!this.busy && this.activeCharacter) {
      const tx = this.playerContainer.x + 55;
      const ty = this.playerContainer.y + 5;
      this.companionContainer.setPosition(
        this.companionContainer.x + (tx - this.companionContainer.x) * 0.04,
        this.companionContainer.y + (ty - this.companionContainer.y) * 0.04
      );
    }

    // Anchor speech bubbles to their targets
    if (this.speechBubble) {
      this.speechBubble.setPosition(this.playerContainer.x, this.playerContainer.y - 55);
    }
    if (this.companionBubble) {
      this.companionBubble.setPosition(this.companionContainer.x, this.companionContainer.y - 55);
    }
  }
}
