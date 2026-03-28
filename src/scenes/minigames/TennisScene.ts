import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
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
  private ballRadius = 10;

  private dadX = 80;
  private dadY = GAME_HEIGHT / 2;
  private lillianX = GAME_WIDTH - 80;
  private lillianY = GAME_HEIGHT / 2;

  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;

  private courtTopY = 50;
  private courtBottomY = GAME_HEIGHT - 20;
  private readonly COURT_LEFT = 20;
  private readonly COURT_RIGHT = GAME_WIDTH - 20;
  private readonly NET_X = GAME_WIDTH / 2;

  private dadSwinging = false;
  private lillianSwinging = false;
  private rallyCount = 0;
  private servingPlayer: 1 | 2 = 1;
  private pointInProgress = false;
  private bounceCountLeft = 0;
  private bounceCountRight = 0;

  private aiTimer = 0;
  private aiSwingQueued = false;

  private dadControls!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    swing: Phaser.Input.Keyboard.Key;
  };

  constructor() { super({ key: 'TennisScene' }); }

  create(): void {
    this.score1 = 0;
    this.score2 = 0;
    this.rallyCount = 0;
    this.transitioning = false;

    this.courtTopY = 50;
    this.courtBottomY = GAME_HEIGHT - 20;

    this.createCourt();
    this.createCharacters();
    this.createHUD('Dad', 'Lillian');
    this.setupInput();
    this.serveBall();
    this.gameActive = true;
  }

  private createCourt(): void {
    // Sky
    const skyGfx = this.add.graphics();
    skyGfx.fillStyle(0x87ceeb);
    skyGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Court floor
    skyGfx.fillStyle(0x1e6e1e);
    skyGfx.fillRect(this.COURT_LEFT, GAME_HEIGHT * 0.35, this.COURT_RIGHT - this.COURT_LEFT, GAME_HEIGHT * 0.65);

    // Court boundary lines
    skyGfx.lineStyle(3, 0xffffff, 1);
    skyGfx.strokeRect(this.COURT_LEFT + 10, GAME_HEIGHT * 0.35 + 10, GAME_WIDTH - 40, GAME_HEIGHT * 0.65 - 30);

    // Service boxes
    skyGfx.lineBetween(this.NET_X, GAME_HEIGHT * 0.35 + 10, this.NET_X, GAME_HEIGHT - 20);
    skyGfx.lineBetween(this.COURT_LEFT + 10, GAME_HEIGHT * 0.35 + (GAME_HEIGHT * 0.65 - 30) / 2, this.COURT_RIGHT - 10, GAME_HEIGHT * 0.35 + (GAME_HEIGHT * 0.65 - 30) / 2);

    // Net post
    skyGfx.fillStyle(0x888888);
    skyGfx.fillRect(this.NET_X - 3, GAME_HEIGHT * 0.35, 6, GAME_HEIGHT * 0.65);

    // Net (striped)
    skyGfx.fillStyle(0xffffff, 0.8);
    for (let ny = GAME_HEIGHT * 0.35; ny < GAME_HEIGHT; ny += 14) {
      skyGfx.fillRect(this.NET_X - 2, ny, 4, 8);
    }

    // Ball object
    this.ball = this.add.graphics();
    this.ball.setDepth(10);
  }

  private createCharacters(): void {
    const state = SaveManager.load();
    this.dadContainer = CharacterRenderer.create(this, this.dadX, this.dadY, state.dadConfig, 1.5);
    this.dadContainer.setDepth(5);
    this.lillianContainer = CharacterRenderer.create(this, this.lillianX, this.lillianY, state.lillianConfig, 1.5);
    this.lillianContainer.setDepth(5);
    this.lillianContainer.setScale(-1, 1); // face left
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.dadControls = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        swing: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on('down', () => this.moveDad(-1));
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on('down', () => this.moveDad(1));
    }
  }

  private moveDad(dir: number): void {
    this.dadY = Phaser.Math.Clamp(this.dadY + dir * 20, this.courtTopY + 30, this.courtBottomY - 30);
  }

  private serveBall(): void {
    this.ballX = GAME_WIDTH / 2;
    this.ballY = GAME_HEIGHT / 2;
    this.bounceCountLeft = 0;
    this.bounceCountRight = 0;
    this.rallyCount = 0;
    this.pointInProgress = false;

    this.time.delayedCall(800, () => {
      const dir = this.servingPlayer === 1 ? 1 : -1;
      this.ballVX = 260 * dir;
      this.ballVY = (Math.random() - 0.5) * 200;
      this.pointInProgress = true;
    });
  }

  private trySwingDad(): void {
    if (this.dadSwinging) return;
    const dist = Phaser.Math.Distance.Between(this.dadX, this.dadY, this.ballX, this.ballY);
    if (dist < 70 && this.ballX < this.NET_X) {
      this.dadSwinging = true;
      this.hitBall(1, this.dadX, this.dadY);
      this.time.delayedCall(300, () => { this.dadSwinging = false; });
    }
  }

  private hitBall(player: 1 | 2, px: number, py: number): void {
    const dir = player === 1 ? 1 : -1;
    const baseSpeed = 280 + this.rallyCount * 12;
    const yDiff = (py - this.ballY) / 60;
    this.ballVX = baseSpeed * dir;
    this.ballVY = yDiff * 200 - 80;
    this.rallyCount++;
    this.bounceCountLeft = 0;
    this.bounceCountRight = 0;

    // Flash effect
    const flash = this.add.graphics();
    flash.fillStyle(0xffd700, 0.7);
    flash.fillCircle(this.ballX, this.ballY, 20);
    flash.setDepth(15);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 2, scaleY: 2,
      duration: 200, onComplete: () => flash.destroy(),
    });
  }

  private updateAI(delta: number): void {
    // Move toward ball
    const diff = this.ballY - this.lillianY;
    const moveSpeed = 160;
    if (Math.abs(diff) > 10) {
      this.lillianY += Math.sign(diff) * Math.min(Math.abs(diff), moveSpeed * delta / 1000);
      this.lillianY = Phaser.Math.Clamp(this.lillianY, this.courtTopY + 30, this.courtBottomY - 30);
    }

    // AI swing decision
    this.aiTimer += delta;
    if (!this.aiSwingQueued) {
      const dist = Phaser.Math.Distance.Between(this.lillianX, this.lillianY, this.ballX, this.ballY);
      if (dist < 80 && this.ballX > this.NET_X && this.ballVX > 0) {
        // Queue swing with slight delay and random miss chance
        this.aiSwingQueued = true;
        const swingDelay = 50 + Math.random() * 80;
        this.time.delayedCall(swingDelay, () => {
          this.aiSwingQueued = false;
          if (Math.random() > 0.2) { // 80% success rate
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

    this.time.delayedCall(1000, () => {
      if (this.gameActive) this.serveBall();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;

    const dt = delta / 1000;

    // Player input
    if (this.dadControls) {
      if (this.dadControls.up.isDown) {
        this.dadY = Phaser.Math.Clamp(this.dadY - 200 * dt, this.courtTopY + 30, this.courtBottomY - 30);
      }
      if (this.dadControls.down.isDown) {
        this.dadY = Phaser.Math.Clamp(this.dadY + 200 * dt, this.courtTopY + 30, this.courtBottomY - 30);
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

    // Gravity on ball
    this.ballVY += 320 * dt;

    // Floor bounce
    if (this.ballY > this.courtBottomY - this.ballRadius) {
      this.ballY = this.courtBottomY - this.ballRadius;
      this.ballVY *= -0.6;

      if (this.ballX < this.NET_X) {
        this.bounceCountLeft++;
        if (this.bounceCountLeft >= 2) this.scorePoint(2);
      } else {
        this.bounceCountRight++;
        if (this.bounceCountRight >= 2) this.scorePoint(1);
      }
    }

    // Top wall
    if (this.ballY < this.courtTopY + this.ballRadius) {
      this.ballY = this.courtTopY + this.ballRadius;
      this.ballVY *= -0.8;
    }

    // Side walls
    if (this.ballX < this.COURT_LEFT + this.ballRadius) {
      this.ballX = this.COURT_LEFT + this.ballRadius;
      this.ballVX *= -0.9;
      this.scorePoint(1); // out on left side = point for player 2... but player 1 is on left, treat as out
    }
    if (this.ballX > this.COURT_RIGHT - this.ballRadius) {
      this.ballX = this.COURT_RIGHT - this.ballRadius;
      this.ballVX *= -0.9;
      this.scorePoint(2);
    }

    // Net collision
    if (Math.abs(this.ballX - this.NET_X) < 5 && this.ballY > GAME_HEIGHT * 0.35) {
      if (this.ballVX > 0) {
        this.ballX = this.NET_X - 5;
        this.ballVX *= -0.7;
      } else {
        this.ballX = this.NET_X + 5;
        this.ballVX *= -0.7;
      }
    }

    // Draw ball
    this.ball.clear();
    this.ball.fillStyle(0xc8e600);
    this.ball.fillCircle(this.ballX, this.ballY, this.ballRadius);
    this.ball.lineStyle(1.5, 0x888800, 0.6);
    this.ball.beginPath();
    this.ball.arc(this.ballX - 3, this.ballY, 6, -0.5, 0.5);
    this.ball.strokePath();

    // Ball shadow
    this.ball.fillStyle(0x000000, 0.2);
    this.ball.fillEllipse(this.ballX, this.courtBottomY - 3, 16, 5);
  }

  private transitioning = false;
  protected async exitToHub(): Promise<void> {
    this.transitioning = true;
    this.gameActive = false;
    await super.exitToHub();
  }
}
