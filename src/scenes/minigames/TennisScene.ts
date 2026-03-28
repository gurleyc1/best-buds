import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';

export class TennisScene extends BaseMiniGameScene {
  protected gameName = 'tennis';

  private ball!: Phaser.GameObjects.Graphics;
  private ballX = GAME_WIDTH / 2;
  private ballY = GAME_HEIGHT / 2;
  private ballVX = 0;
  private ballVY = 0;
  private readonly BALL_RADIUS = 8;

  // Ball trail
  private ballTrail: Array<{ x: number; y: number; alpha: number }> = [];

  private dadX = 80;
  private dadY = GAME_HEIGHT / 2;
  private lillianX = GAME_WIDTH - 80;
  private lillianY = GAME_HEIGHT / 2;

  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;

  private readonly COURT_TOP_Y = 50;
  private readonly COURT_BOTTOM_Y = GAME_HEIGHT - 20;
  private readonly COURT_LEFT = 20;
  private readonly COURT_RIGHT = GAME_WIDTH - 20;
  private readonly NET_X = GAME_WIDTH / 2;
  // Net height: covers from courtTop to courtBottom
  private readonly NET_TOP_Y = GAME_HEIGHT * 0.35;

  private dadSwinging = false;
  private lillianSwinging = false;
  private rallyCount = 0;
  private servingPlayer: 1 | 2 = 1;
  private pointInProgress = false;
  private bounceCountLeft = 0;
  private bounceCountRight = 0;

  private aiTimer = 0;
  private aiSwingQueued = false;

  // Start screen
  private startScreen!: Phaser.GameObjects.Container;
  private gameStarted = false;

  // HUD overlay
  private controlLegend!: Phaser.GameObjects.Text;
  private pointBannerText!: Phaser.GameObjects.Text;

  // Swing arc graphics
  private swingArc!: Phaser.GameObjects.Graphics;

  private dadControls!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    swing: Phaser.Input.Keyboard.Key;
  };

  private transitioning = false;

  constructor() { super({ key: 'TennisScene' }); }

  create(): void {
    this.score1 = 0;
    this.score2 = 0;
    this.rallyCount = 0;
    this.transitioning = false;
    this.gameStarted = false;
    this.ballTrail = [];

    this.createCourt();
    this.createCharacters();
    this.createHUD('Dad', 'Lillian');
    this.createControlLegend();
    this.createSwingArc();
    this.setupInput();
    this.showStartScreen();
  }

  private createCourt(): void {
    // Sky
    const skyGfx = this.add.graphics();
    skyGfx.fillStyle(0x87ceeb);
    skyGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Court floor
    skyGfx.fillStyle(0x1e6e1e);
    const courtTop = GAME_HEIGHT * 0.35;
    const courtH = GAME_HEIGHT * 0.65;
    skyGfx.fillRect(this.COURT_LEFT, courtTop, this.COURT_RIGHT - this.COURT_LEFT, courtH);

    // Court boundary lines
    skyGfx.lineStyle(3, 0xffffff, 1);
    skyGfx.strokeRect(this.COURT_LEFT + 10, courtTop + 10, GAME_WIDTH - 40, courtH - 30);

    // Service boxes
    skyGfx.lineBetween(this.NET_X, courtTop + 10, this.NET_X, GAME_HEIGHT - 20);
    skyGfx.lineBetween(
      this.COURT_LEFT + 10, courtTop + (courtH - 30) / 2,
      this.COURT_RIGHT - 10, courtTop + (courtH - 30) / 2
    );

    // Net solid post
    skyGfx.fillStyle(0x888888);
    skyGfx.fillRect(this.NET_X - 3, courtTop, 6, courtH);

    // Net stripes
    skyGfx.fillStyle(0xffffff, 0.8);
    for (let ny = courtTop; ny < GAME_HEIGHT; ny += 14) {
      skyGfx.fillRect(this.NET_X - 2, ny, 4, 8);
    }

    // Ball graphics (drawn in update)
    this.ball = this.add.graphics();
    this.ball.setDepth(10);

    // Point banner (hidden until needed)
    this.pointBannerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '', {
      fontSize: '40px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(210).setVisible(false);
  }

  private createCharacters(): void {
    const state = SaveManager.load();
    this.dadContainer = CharacterRenderer.create(this, this.dadX, this.dadY, state.dadConfig, 1.5);
    this.dadContainer.setDepth(5);
    this.lillianContainer = CharacterRenderer.create(this, this.lillianX, this.lillianY, state.lillianConfig, 1.5);
    this.lillianContainer.setDepth(5);
    this.lillianContainer.setScale(-1.5, 1.5);
  }

  private createControlLegend(): void {
    this.controlLegend = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT - 14,
      '← → Move  |  SPACE Swing',
      {
        fontSize: '12px', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 8, y: 3 },
      }
    ).setOrigin(0.5, 1).setDepth(105);
  }

  private createSwingArc(): void {
    this.swingArc = this.add.graphics();
    this.swingArc.setDepth(12);
  }

  private showStartScreen(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(300);

    const readyTxt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Ready?', {
      fontSize: '52px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(301);

    const ctrlTxt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '← → Move\nSPACE Swing', {
      fontSize: '22px', color: '#ffffff', align: 'center',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(301);

    const serveTxt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, 'Press SPACE to serve!', {
      fontSize: '20px', color: '#aaffaa',
      backgroundColor: '#00000066', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(301);

    // Pulsing serve text
    this.tweens.add({
      targets: serveTxt,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.startScreen = this.add.container(0, 0, [bg, readyTxt, ctrlTxt, serveTxt]);
    this.startScreen.setDepth(300);

    // Wait for SPACE to start
    const onStart = () => {
      if (this.gameStarted) return;
      this.gameStarted = true;
      this.startScreen.destroy();
      this.gameActive = true;
      this.serveBall();
    };

    if (this.input.keyboard) {
      this.input.keyboard.once('keydown-SPACE', onStart);
    }
    this.input.once('pointerdown', onStart);
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.dadControls = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        swing: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
    }
  }

  private serveBall(): void {
    this.ballX = GAME_WIDTH / 2;
    this.ballY = GAME_HEIGHT / 2;
    this.bounceCountLeft = 0;
    this.bounceCountRight = 0;
    this.rallyCount = 0;
    this.pointInProgress = false;
    this.ballTrail = [];

    this.time.delayedCall(600, () => {
      if (!this.gameActive) return;
      const dir = this.servingPlayer === 1 ? 1 : -1;
      // Moderate starting speed (250 px/s)
      this.ballVX = 250 * dir;
      this.ballVY = (Math.random() - 0.5) * 180;
      this.pointInProgress = true;
    });
  }

  private trySwingDad(): void {
    if (this.dadSwinging) return;
    const dist = Phaser.Math.Distance.Between(this.dadX, this.dadY, this.ballX, this.ballY);

    // Show swing arc regardless
    this.showSwingArc(this.dadX, this.dadY);

    if (dist < 70 && this.ballX < this.NET_X) {
      this.dadSwinging = true;
      this.hitBall(1, this.dadX, this.dadY);
      this.time.delayedCall(300, () => { this.dadSwinging = false; });
    } else {
      // Miss feedback
      this.showMissText(this.dadX, this.dadY);
    }
  }

  private showSwingArc(px: number, py: number): void {
    this.swingArc.clear();
    this.swingArc.lineStyle(4, 0xffd700, 0.9);
    this.swingArc.beginPath();
    this.swingArc.arc(px, py, 38, -0.8, 0.8, false);
    this.swingArc.strokePath();
    this.swingArc.lineStyle(2, 0xffffff, 0.6);
    this.swingArc.beginPath();
    this.swingArc.arc(px, py, 52, -0.6, 0.6, false);
    this.swingArc.strokePath();

    this.tweens.add({
      targets: this.swingArc,
      alpha: 0,
      duration: 250,
      onComplete: () => { this.swingArc.setAlpha(1); this.swingArc.clear(); },
    });
  }

  private showMissText(px: number, py: number): void {
    const miss = this.add.text(px, py - 40, 'Miss!', {
      fontSize: '22px', color: '#ff4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(220);

    this.tweens.add({
      targets: miss,
      y: py - 90, alpha: 0,
      duration: 700, ease: 'Power2',
      onComplete: () => miss.destroy(),
    });
  }

  private hitBall(player: 1 | 2, px: number, py: number): void {
    const dir = player === 1 ? 1 : -1;
    // Speed increases with rally
    const baseSpeed = 250 + this.rallyCount * 15;
    const yDiff = (py - this.ballY) / 60;
    this.ballVX = baseSpeed * dir;
    this.ballVY = yDiff * 200 - 80;
    this.rallyCount++;
    this.bounceCountLeft = 0;
    this.bounceCountRight = 0;

    // Hit flash
    const flash = this.add.graphics();
    flash.fillStyle(0xffd700, 0.7);
    flash.fillCircle(this.ballX, this.ballY, 22);
    flash.setDepth(15);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 2, scaleY: 2,
      duration: 200, onComplete: () => flash.destroy(),
    });
  }

  private updateAI(delta: number): void {
    // Move Lillian toward ball
    const diff = this.ballY - this.lillianY;
    const moveSpeed = 170;
    if (Math.abs(diff) > 10) {
      this.lillianY += Math.sign(diff) * Math.min(Math.abs(diff), moveSpeed * delta / 1000);
      this.lillianY = Phaser.Math.Clamp(this.lillianY, this.COURT_TOP_Y + 30, this.COURT_BOTTOM_Y - 30);
    }

    this.aiTimer += delta;
    if (!this.aiSwingQueued) {
      const dist = Phaser.Math.Distance.Between(this.lillianX, this.lillianY, this.ballX, this.ballY);
      if (dist < 80 && this.ballX > this.NET_X && this.ballVX > 0) {
        this.aiSwingQueued = true;
        const swingDelay = 50 + Math.random() * 80;
        this.time.delayedCall(swingDelay, () => {
          this.aiSwingQueued = false;
          if (Math.random() > 0.2) {
            const dist2 = Phaser.Math.Distance.Between(this.lillianX, this.lillianY, this.ballX, this.ballY);
            if (dist2 < 90 && this.ballX > this.NET_X) {
              this.lillianSwinging = true;
              this.hitBall(2, this.lillianX, this.lillianY);
              this.time.delayedCall(300, () => { this.lillianSwinging = false; });
            }
          }
        });
      }
    }
  }

  private scorePoint(player: 1 | 2): void {
    if (!this.pointInProgress) return;
    this.pointInProgress = false;
    this.addScore(player);
    this.servingPlayer = player === 1 ? 2 : 1;

    const label = player === 1 ? 'Point — Dad!' : 'Point — Lillian!';
    this.showPointBanner(label);

    this.time.delayedCall(1400, () => {
      if (this.gameActive) this.serveBall();
    });
  }

  private showPointBanner(label: string): void {
    this.pointBannerText.setText(label);
    this.pointBannerText.setVisible(true);
    this.pointBannerText.setAlpha(1).setScale(1);

    this.tweens.add({
      targets: this.pointBannerText,
      scaleX: 1.25, scaleY: 1.25,
      duration: 250, yoyo: true,
    });

    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: this.pointBannerText,
        alpha: 0, duration: 200,
        onComplete: () => { this.pointBannerText.setVisible(false); this.pointBannerText.setAlpha(1); },
      });
    });
  }

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;

    const dt = delta / 1000;

    // Player input: move Dad with LEFT/RIGHT
    if (this.dadControls) {
      if (this.dadControls.up.isDown) {
        this.dadY = Phaser.Math.Clamp(this.dadY - 200 * dt, this.COURT_TOP_Y + 30, this.COURT_BOTTOM_Y - 30);
      }
      if (this.dadControls.down.isDown) {
        this.dadY = Phaser.Math.Clamp(this.dadY + 200 * dt, this.COURT_TOP_Y + 30, this.COURT_BOTTOM_Y - 30);
      }
      if (Phaser.Input.Keyboard.JustDown(this.dadControls.swing)) {
        this.trySwingDad();
      }
    }

    // AI
    this.updateAI(delta);

    // Update character positions
    this.dadContainer.setPosition(this.dadX, this.dadY);
    this.lillianContainer.setPosition(this.lillianX, this.lillianY);

    if (!this.pointInProgress) return;

    // Move ball
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Gravity
    this.ballVY += 320 * dt;

    // Ball trail
    this.ballTrail.push({ x: this.ballX, y: this.ballY, alpha: 0.65 });
    if (this.ballTrail.length > 6) this.ballTrail.shift();
    for (const t of this.ballTrail) t.alpha *= 0.78;

    // Floor bounce — satisfying bounce (0.7)
    if (this.ballY > this.COURT_BOTTOM_Y - this.BALL_RADIUS) {
      this.ballY = this.COURT_BOTTOM_Y - this.BALL_RADIUS;
      this.ballVY *= -0.7;

      // Bounce dust puff
      const puff = this.add.graphics();
      puff.fillStyle(0xffffff, 0.4);
      puff.fillEllipse(this.ballX, this.COURT_BOTTOM_Y, 22, 8);
      puff.setDepth(8);
      this.tweens.add({
        targets: puff, alpha: 0, scaleX: 2.5, scaleY: 0.5,
        duration: 250, onComplete: () => puff.destroy(),
      });

      if (this.ballX < this.NET_X) {
        this.bounceCountLeft++;
        if (this.bounceCountLeft >= 2) this.scorePoint(2);
      } else {
        this.bounceCountRight++;
        if (this.bounceCountRight >= 2) this.scorePoint(1);
      }
    }

    // Top wall
    if (this.ballY < this.COURT_TOP_Y + this.BALL_RADIUS) {
      this.ballY = this.COURT_TOP_Y + this.BALL_RADIUS;
      this.ballVY *= -0.8;
    }

    // Side walls — out scoring
    if (this.ballX < this.COURT_LEFT + this.BALL_RADIUS) {
      this.ballX = this.COURT_LEFT + this.BALL_RADIUS;
      this.ballVX = Math.abs(this.ballVX) * 0.9;
      this.scorePoint(2);
    }
    if (this.ballX > this.COURT_RIGHT - this.BALL_RADIUS) {
      this.ballX = this.COURT_RIGHT - this.BALL_RADIUS;
      this.ballVX = -Math.abs(this.ballVX) * 0.9;
      this.scorePoint(1);
    }

    // Net collision — proper solid body
    const netHalfW = 4;
    if (this.ballY > this.NET_TOP_Y) {
      if (this.ballVX > 0 && this.ballX + this.BALL_RADIUS >= this.NET_X - netHalfW && this.ballX < this.NET_X) {
        // Moving right, hit left face of net
        this.ballX = this.NET_X - netHalfW - this.BALL_RADIUS;
        this.ballVX = -Math.abs(this.ballVX) * 0.5;
        this.ballVY *= 0.8;
      } else if (this.ballVX < 0 && this.ballX - this.BALL_RADIUS <= this.NET_X + netHalfW && this.ballX > this.NET_X) {
        // Moving left, hit right face of net
        this.ballX = this.NET_X + netHalfW + this.BALL_RADIUS;
        this.ballVX = Math.abs(this.ballVX) * 0.5;
        this.ballVY *= 0.8;
      }
    }

    // Draw ball trail
    this.ball.clear();
    for (const t of this.ballTrail) {
      this.ball.fillStyle(0xc8e600, t.alpha * 0.5);
      this.ball.fillCircle(t.x, t.y, this.BALL_RADIUS * 0.75);
    }

    // Ball shadow on floor
    this.ball.fillStyle(0x000000, 0.22);
    this.ball.fillEllipse(this.ballX, this.COURT_BOTTOM_Y - 2, 18, 6);

    // Ball
    this.ball.fillStyle(0xc8e600, 1);
    this.ball.fillCircle(this.ballX, this.ballY, this.BALL_RADIUS);
    // Seam line
    this.ball.lineStyle(1.5, 0x889900, 0.7);
    this.ball.beginPath();
    this.ball.arc(this.ballX - 3, this.ballY, 5, -0.5, 0.5);
    this.ball.strokePath();
  }

  protected async exitToHub(): Promise<void> {
    this.transitioning = true;
    this.gameActive = false;
    await super.exitToHub();
  }
}
