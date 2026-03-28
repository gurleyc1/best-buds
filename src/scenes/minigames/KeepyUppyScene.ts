import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';

export class KeepyUppyScene extends BaseMiniGameScene {
  protected gameName = 'keepy_uppy';

  private ballX = GAME_WIDTH / 2;
  private ballY = 300;
  private ballVX = 20;
  private ballVY = -50;
  private ballR = 22;

  private windValue = 0;
  private windDir = 1;
  private windTimer = 0;
  private windDirTimer = 0;

  private hits = 0;
  private gravity = 40;

  private ballGfx!: Phaser.GameObjects.Graphics;
  private windGfx!: Phaser.GameObjects.Graphics;
  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;
  private dadRaised = false;
  private lillianRaised = false;
  private raiseTimer = 0;
  private hitsText!: Phaser.GameObjects.Text;

  private groundY = GAME_HEIGHT - 80;

  constructor() { super({ key: 'KeepyUppyScene' }); }

  create(): void {
    this.score1 = 0;
    this.hits = 0;
    this.ballX = GAME_WIDTH / 2;
    this.ballY = 300;
    this.ballVX = 20;
    this.ballVY = -50;
    this.windValue = 0;
    this.windDir = 1;
    this.windTimer = 0;
    this.windDirTimer = 0;
    this.gravity = 40;

    this.createBackground();
    this.createCharacters();
    this.createHUD('Hits');
    this.createBallAndUI();
    this.setupInput();
    this.gameActive = true;
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    // Sky gradient
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xc9e8f9, 0xc9e8f9, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.72);

    // Sun
    bg.fillStyle(0xffd700);
    bg.fillCircle(60, 80, 36);
    bg.fillStyle(0xffec6e, 0.6);
    bg.fillCircle(60, 80, 50);

    // Clouds
    bg.fillStyle(0xffffff, 0.85);
    this.drawCloud(bg, 120, 120, 60);
    this.drawCloud(bg, 320, 80, 50);
    this.drawCloud(bg, 420, 150, 40);

    // Trees on sides
    this.drawTree(bg, 30, 480);
    this.drawTree(bg, 60, 510);
    this.drawTree(bg, GAME_WIDTH - 50, 490);
    this.drawTree(bg, GAME_WIDTH - 20, 520);

    // Ground
    bg.fillStyle(0x4caf50);
    bg.fillRect(0, this.groundY - 20, GAME_WIDTH, GAME_HEIGHT - this.groundY + 20);
    bg.fillStyle(0x388e3c);
    bg.fillRect(0, this.groundY - 20, GAME_WIDTH, 20);

    // Wind indicator area
    this.windGfx = this.add.graphics();
    this.windGfx.setDepth(50);
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    g.fillCircle(x, y, size * 0.6);
    g.fillCircle(x + size * 0.5, y + size * 0.1, size * 0.5);
    g.fillCircle(x - size * 0.4, y + size * 0.1, size * 0.45);
    g.fillCircle(x + size * 0.1, y + size * 0.3, size * 0.55);
  }

  private drawTree(g: Phaser.GameObjects.Graphics, x: number, baseY: number): void {
    g.fillStyle(0x795548);
    g.fillRect(x - 4, baseY - 40, 8, 40);
    g.fillStyle(0x4caf50);
    g.fillCircle(x, baseY - 50, 24);
    g.fillStyle(0x388e3c);
    g.fillCircle(x - 8, baseY - 42, 16);
    g.fillCircle(x + 8, baseY - 42, 16);
  }

  private createCharacters(): void {
    const state = SaveManager.load();
    this.dadContainer = CharacterRenderer.create(
      this, 80, this.groundY - 20, state.dadConfig, 1.8
    );
    this.dadContainer.setDepth(5);

    this.lillianContainer = CharacterRenderer.create(
      this, GAME_WIDTH - 80, this.groundY - 20, state.lillianConfig, 1.5
    );
    this.lillianContainer.setDepth(5);
  }

  private createBallAndUI(): void {
    this.ballGfx = this.add.graphics();
    this.ballGfx.setDepth(10);

    this.hitsText = this.add.text(GAME_WIDTH / 2, 30, 'Hits: 0', {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);

    // Instruction
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Tap anywhere to hit the balloon!', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#00000055', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(101);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.gameActive) return;
      // Check if balloon near tap
      const dx = Math.abs(this.ballX - ptr.x);
      const dist = Phaser.Math.Distance.Between(this.ballX, this.ballY, ptr.x, ptr.y);
      if (dist < 120 + this.ballR && this.ballY <= ptr.y + 20) {
        this.hitBalloon(ptr.x, ptr.y);
      }
      void dx;
    });
  }

  private hitBalloon(tapX: number, _tapY: number): void {
    this.hits++;
    this.score1 = this.hits;
    this.scoreText1?.setText(String(this.hits));
    this.hitsText.setText('Hits: ' + this.hits);

    const upForce = 250 + Math.random() * 200;
    const horizontalPush = (tapX - this.ballX) * 0.15 + (Math.random() - 0.5) * 50;
    this.ballVY = -upForce;
    this.ballVX += horizontalPush;
    this.ballVX = Phaser.Math.Clamp(this.ballVX, -150, 150);

    // Arm raise animation
    this.dadRaised = true;
    this.lillianRaised = true;
    this.raiseTimer = 400;

    // Scale pulse on balloon
    this.tweens.add({
      targets: this.ballGfx,
      scaleX: 1.2, scaleY: 0.85,
      duration: 100,
      yoyo: true,
    });

    if (this.hits % 10 === 0) {
      this.showCelebration('\u2B50 ' + this.hits + ' hits! \u2B50');
    }
  }

  private updateWind(delta: number): void {
    this.windTimer += delta / 1000;
    this.windDirTimer += delta / 1000;

    // Increase wind every 30 seconds
    if (this.windTimer >= 30) {
      this.windTimer = 0;
      this.windValue = Math.min(3.0, this.windValue + 0.5);
    }

    // Reverse wind direction every 60 seconds
    if (this.windDirTimer >= 60) {
      this.windDirTimer = 0;
      this.windDir *= -1;
    }

    // After 100 hits wind increases faster
    if (this.hits > 100) {
      this.windValue = Math.min(3.0, this.windValue + delta / 60000);
    }
  }

  private drawWindIndicator(): void {
    this.windGfx.clear();
    if (this.windValue <= 0) return;

    const numLeaves = Math.ceil(this.windValue * 2);
    const startX = this.windDir > 0 ? 20 : GAME_WIDTH - 20;
    const windColor = this.windValue > 2 ? 0xe74c3c : this.windValue > 1 ? 0xf39c12 : 0xffffff;

    this.windGfx.fillStyle(windColor, 0.7);
    const arrowDir = this.windDir > 0 ? '→' : '←';
    void arrowDir;

    for (let i = 0; i < numLeaves; i++) {
      const lx = startX + this.windDir * i * 20;
      const ly = 65 + i * 2;
      this.windGfx.fillEllipse(lx, ly, 10, 5);
    }

    // Wind text indicator
    this.windGfx.fillStyle(0x000000, 0.4);
    this.windGfx.fillRoundedRect(10, 58, 100, 18, 4);
  }

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;
    const dt = delta / 1000;

    this.updateWind(delta);

    // Difficulty ramp
    const gravMult = this.hits > 50 ? 1.4 : 1.0;
    const currentGravity = this.gravity * gravMult;

    // Apply wind
    this.ballVX += this.windDir * this.windValue * 20 * dt;

    // Apply gravity
    this.ballVY += currentGravity * dt;

    // Move ball
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Drag
    this.ballVX *= (1 - 0.5 * dt);

    // Wall bounces
    if (this.ballX - this.ballR < 0) {
      this.ballX = this.ballR;
      this.ballVX = Math.abs(this.ballVX) * 0.7;
    }
    if (this.ballX + this.ballR > GAME_WIDTH) {
      this.ballX = GAME_WIDTH - this.ballR;
      this.ballVX = -Math.abs(this.ballVX) * 0.7;
    }
    if (this.ballY - this.ballR < 40) {
      this.ballY = 40 + this.ballR;
      this.ballVY = Math.abs(this.ballVY) * 0.5;
    }

    // Ground bounce (no fail)
    if (this.ballY + this.ballR >= this.groundY - 20) {
      this.ballY = this.groundY - 20 - this.ballR;
      this.ballVY = -Math.abs(this.ballVY) * 0.4 - 100; // Bounce back up
      this.ballVX *= 0.8;
    }

    // Arm raise decay
    if (this.raiseTimer > 0) {
      this.raiseTimer -= delta;
      if (this.raiseTimer <= 0) {
        this.dadRaised = false;
        this.lillianRaised = false;
      }
    }

    // Character bobbing when raised
    if (this.dadRaised) {
      this.dadContainer.setY(this.groundY - 20 - Math.sin(Date.now() * 0.01) * 6);
    } else {
      this.dadContainer.setY(this.groundY - 20);
    }
    if (this.lillianRaised) {
      this.lillianContainer.setY(this.groundY - 20 - Math.sin(Date.now() * 0.01 + 1) * 5);
    } else {
      this.lillianContainer.setY(this.groundY - 20);
    }

    // Draw balloon
    this.drawBalloon();
    this.drawWindIndicator();
  }

  private drawBalloon(): void {
    this.ballGfx.clear();
    const r = this.ballR;

    // String
    this.ballGfx.lineStyle(1.5, 0xaaaaaa, 0.8);
    this.ballGfx.lineBetween(this.ballX, this.ballY + r, this.ballX + Math.sin(this.ballVX * 0.05) * 8, this.ballY + r * 2.2);

    // Shadow
    this.ballGfx.fillStyle(0x000000, 0.15);
    this.ballGfx.fillEllipse(this.ballX, this.ballY + r + 4, r * 1.5, r * 0.4);

    // Balloon body
    this.ballGfx.fillStyle(0xff69b4);
    this.ballGfx.fillEllipse(this.ballX, this.ballY, r * 2, r * 2.4);

    // Highlight
    this.ballGfx.fillStyle(0xffb3d1, 0.75);
    this.ballGfx.fillEllipse(this.ballX - r * 0.3, this.ballY - r * 0.35, r * 0.7, r * 0.9);
    this.ballGfx.fillStyle(0xffffff, 0.5);
    this.ballGfx.fillEllipse(this.ballX - r * 0.25, this.ballY - r * 0.3, r * 0.3, r * 0.45);

    // Knot
    this.ballGfx.fillStyle(0xff1493);
    this.ballGfx.fillTriangle(
      this.ballX - 4, this.ballY + r,
      this.ballX + 4, this.ballY + r,
      this.ballX, this.ballY + r * 1.35
    );
  }
}
