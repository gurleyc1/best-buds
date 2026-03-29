import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';
import { MusicManager } from '../../systems/MusicManager';

export class TennisScene extends BaseMiniGameScene {
  protected gameName = 'tennis';

  // ── Court constants ────────────────────────────────────────────────────────
  private readonly FLOOR_Y = Math.round(GAME_HEIGHT * 0.80);   // court surface / ball bounce line
  private readonly CEILING_Y = 200;                             // upper player/ball boundary
  private readonly LEFT_WALL = 10;
  private readonly RIGHT_WALL = GAME_WIDTH - 10;
  private readonly NET_X = GAME_WIDTH / 2;
  private readonly NET_TOP_Y: number;                           // set in constructor
  private readonly NET_HALF_W = 4;
  private readonly BALL_R = 8;

  // ── Player positions ───────────────────────────────────────────────────────
  private dadX = 70;
  private dadY = 0;                      // set properly in create()
  private lillianX = GAME_WIDTH - 70;
  private lillianY = 0;

  // ── Ball (manual physics) ──────────────────────────────────────────────────
  private ballX = 0;
  private ballY = 0;
  private ballVX = 0;
  private ballVY = 0;
  private readonly GRAVITY = 400;
  private readonly BOUNCE_Y = 0.65;

  // ── Ball trail ─────────────────────────────────────────────────────────────
  private ballTrail: Array<{ x: number; y: number; alpha: number }> = [];

  // ── Game state ─────────────────────────────────────────────────────────────
  private rallySpeed = 280;            // px/s base, grows with each hit
  private readonly MAX_RALLY_SPEED = 550;
  private readonly RALLY_INCREMENT = 20;
  private servingPlayer: 1 | 2 = 1;
  private pointInProgress = false;
  private serving = false;             // waiting for SPACE to launch
  private gameStarted = false;
  private transitioning = false;

  // ── Swing state ───────────────────────────────────────────────────────────
  private dadSwinging = false;
  private lillianSwinging = false;
  private aiReactionTimer = 0;
  private aiSwingQueued = false;

  // ── 2P mode ───────────────────────────────────────────────────────────────
  private twoPlayer = false;

  // ── Net hit counter (stuck-ball fix) ─────────────────────────────────────
  private netHits = 0;

  // ── Character names ───────────────────────────────────────────────────────
  private dadName = 'Dad';
  private lillianName = 'Lillian';

  // ── Graphics / containers ─────────────────────────────────────────────────
  private ballGfx!: Phaser.GameObjects.Graphics;
  private swingArc!: Phaser.GameObjects.Graphics;
  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;
  private pointBannerText!: Phaser.GameObjects.Text;

  // ── Input keys ────────────────────────────────────────────────────────────
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  // 2P keys
  private keyI!: Phaser.Input.Keyboard.Key;
  private keyK!: Phaser.Input.Keyboard.Key;
  private keyN!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'TennisScene' });
    this.NET_TOP_Y = Math.round(GAME_HEIGHT * 0.80) - 90;
  }

  create(data?: { returnX?: number; returnY?: number }): void {
    this.captureReturnData(data);
    this.score1 = 0;
    this.score2 = 0;
    this.rallySpeed = 280;
    this.transitioning = false;
    this.gameStarted = false;
    this.pointInProgress = false;
    this.serving = false;
    this.ballTrail = [];
    this.dadSwinging = false;
    this.lillianSwinging = false;
    this.aiSwingQueued = false;
    this.aiReactionTimer = 0;
    this.servingPlayer = 1;
    this.twoPlayer = false;

    this.dadY = this.FLOOR_Y - 40;
    this.lillianY = this.FLOOR_Y - 40;

    const state = SaveManager.load();
    this.dadName = state.dadConfig.name || 'Dad';
    this.lillianName = state.lillianConfig.name || 'Lillian';

    this.createCourt();
    this.createCharacters();
    this.createHUD(this.dadName, this.lillianName);
    this.createControlBar();
    this.createSwingArc();
    this.setupInput();
    this.setupEscapeKey();
    this.showStartScreen();
    MusicManager.playTheme('tennis');
    MusicManager.sfx('start');
  }

  // ─── Court ─────────────────────────────────────────────────────────────────

  private createCourt(): void {
    const g = this.add.graphics();
    const COURT_TOP = 80;   // where green court starts
    const cLeft  = 24;
    const cRight = GAME_WIDTH - 24;

    // Narrow sky strip at very top
    g.fillStyle(0x5aaae0);
    g.fillRect(0, 0, GAME_WIDTH, COURT_TOP);

    // Thin fence / back-wall strip
    g.fillStyle(0x1a5c1a);
    g.fillRect(0, COURT_TOP, GAME_WIDTH, 8);

    // Green court — fills everything from fence to bottom of canvas
    g.fillStyle(0x2e7d32);
    g.fillRect(0, COURT_TOP + 8, GAME_WIDTH, GAME_HEIGHT - (COURT_TOP + 8));

    // Court boundary lines (white)
    g.lineStyle(2, 0xffffff, 0.75);
    // Top of playing area (ceiling line)
    g.lineBetween(cLeft, this.CEILING_Y, cRight, this.CEILING_Y);
    // Sidelines
    g.lineBetween(cLeft,  this.CEILING_Y, cLeft,  this.FLOOR_Y);
    g.lineBetween(cRight, this.CEILING_Y, cRight, this.FLOOR_Y);
    // Baseline at floor
    g.lineBetween(cLeft, this.FLOOR_Y, cRight, this.FLOOR_Y);
    // Service boxes
    const svcY = this.CEILING_Y + (this.FLOOR_Y - this.CEILING_Y) * 0.45;
    g.lineBetween(cLeft, svcY, cRight, svcY);
    g.lineBetween(this.NET_X, this.CEILING_Y, this.NET_X, svcY);

    // Net posts
    g.fillStyle(0xcccccc);
    g.fillRect(cLeft  - 2, this.NET_TOP_Y - 4, 5, this.FLOOR_Y - this.NET_TOP_Y + 4);
    g.fillRect(cRight - 3, this.NET_TOP_Y - 4, 5, this.FLOOR_Y - this.NET_TOP_Y + 4);

    // Net — narrow vertical strip at center
    g.fillStyle(0xffffff, 0.92);
    g.fillRect(this.NET_X - this.NET_HALF_W, this.NET_TOP_Y, this.NET_HALF_W * 2, this.FLOOR_Y - this.NET_TOP_Y);
    // Net top band
    g.fillStyle(0xdddddd);
    g.fillRect(this.NET_X - this.NET_HALF_W - 2, this.NET_TOP_Y - 4, this.NET_HALF_W * 2 + 4, 6);
    // Net mesh lines
    g.lineStyle(1, 0xaaaaaa, 0.5);
    for (let ny = this.NET_TOP_Y; ny < this.FLOOR_Y; ny += 10) {
      g.lineBetween(this.NET_X - this.NET_HALF_W, ny, this.NET_X + this.NET_HALF_W, ny);
    }

    // Point banner
    this.pointBannerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '', {
      fontSize: '40px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(210).setVisible(false);

    // Ball graphics
    this.ballGfx = this.add.graphics();
    this.ballGfx.setDepth(10);
  }

  // ─── Characters ────────────────────────────────────────────────────────────

  private createCharacters(): void {
    const state = SaveManager.load();
    this.dadContainer = CharacterRenderer.create(this, this.dadX, this.dadY, state.dadConfig, 1.8);
    this.dadContainer.setDepth(5);
    this.lillianContainer = CharacterRenderer.create(this, this.lillianX, this.lillianY, state.lillianConfig, 1.5);
    this.lillianContainer.setDepth(5);
    this.lillianContainer.setScale(-1.5, 1.5);
  }

  // ─── Control bar ───────────────────────────────────────────────────────────

  private createControlBar(): void {
    const barH = 24;
    const barY = GAME_HEIGHT - barH;
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.55);
    bar.fillRect(0, barY, GAME_WIDTH, barH);
    bar.setDepth(104);

    this.add.text(8, barY + 4, '↑↓ Move  |  SPACE Hit', {
      fontSize: '11px', color: '#ffffff',
    }).setDepth(105);

    this.add.text(GAME_WIDTH - 8, barY + 4, this.twoPlayer ? 'I K Move  |  N Hit' : 'AI', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(105);
  }

  // ─── Swing arc ─────────────────────────────────────────────────────────────

  private createSwingArc(): void {
    this.swingArc = this.add.graphics();
    this.swingArc.setDepth(12);
  }

  // ─── Start screen ──────────────────────────────────────────────────────────

  private showStartScreen(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(300);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Tennis! 🎾', {
      fontSize: '52px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(301);

    const controls = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, '↑↓  Move\nSPACE  Swing\n(or tap left/right)', {
      fontSize: '20px', color: '#ffffff', align: 'center',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(301);

    const serveTxt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'Press SPACE or tap to serve!', {
      fontSize: '18px', color: '#aaffaa',
      backgroundColor: '#00000066', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(301);

    this.tweens.add({ targets: serveTxt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    const onStart = () => {
      if (this.gameStarted) return;
      this.gameStarted = true;
      bg.destroy(); title.destroy(); controls.destroy(); serveTxt.destroy();
      this.gameActive = true;
      this.beginServe();
    };

    if (this.input.keyboard) {
      this.input.keyboard.once('keydown-SPACE', onStart);
    }
    this.input.once('pointerdown', onStart);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private setupInput(): void {
    if (this.input.keyboard) {
      this.keyUp    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.keyDown  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.keyW     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyS     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyI     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
      this.keyK     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
      this.keyN     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    }

    // Touch: tap anywhere on left half = Dad swing, right half = Lillian swing
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.gameActive || this.serving) return;
      if (ptr.x < GAME_WIDTH / 2) {
        this.trySwing(1);
      } else if (this.twoPlayer) {
        this.trySwing(2);
      }
    });
  }

  // ─── Serve ─────────────────────────────────────────────────────────────────

  private beginServe(): void {
    this.pointInProgress = false;
    this.serving = true;
    this.rallySpeed = 280;
    this.ballTrail = [];
    this.aiSwingQueued = false;
    this.dadSwinging = false;
    this.lillianSwinging = false;
    this.netHits = 0;

    // Place ball at server's racket
    if (this.servingPlayer === 1) {
      this.ballX = this.dadX + 35;
      this.ballY = this.dadY - 20;
    } else {
      this.ballX = this.lillianX - 35;
      this.ballY = this.lillianY - 20;
    }

    this.ballVX = 0;
    this.ballVY = 0;

    // Show "Serve!" prompt
    const serveTxt = this.add.text(GAME_WIDTH / 2, this.CEILING_Y + 30, 'Press SPACE to serve!', {
      fontSize: '18px', color: '#ffd700',
      backgroundColor: '#00000077', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(205);

    const clearServe = () => {
      serveTxt.destroy();
      this.serving = false;
      this.launchBall();
    };

    if (this.input.keyboard) {
      this.input.keyboard.once('keydown-SPACE', () => {
        if (!this.serving) return;
        clearServe();
      });
    }
    this.input.once('pointerdown', () => {
      if (!this.serving) return;
      clearServe();
    });
  }

  private launchBall(): void {
    const dir = this.servingPlayer === 1 ? 1 : -1;
    this.ballVX = this.rallySpeed * dir;
    this.ballVY = -200;
    this.pointInProgress = true;
  }

  // ─── Swing mechanics ───────────────────────────────────────────────────────

  private trySwing(player: 1 | 2): void {
    const px = player === 1 ? this.dadX : this.lillianX;
    const py = player === 1 ? this.dadY : this.lillianY;
    const swinging = player === 1 ? this.dadSwinging : this.lillianSwinging;

    if (swinging) return;
    if (!this.pointInProgress) return;

    this.showSwingArc(px, py, player);

    const dist = Phaser.Math.Distance.Between(px, py, this.ballX, this.ballY);
    // Only hit if ball is on correct half of court and within reach
    const ballOnPlayerSide = player === 1 ? this.ballX < this.NET_X : this.ballX > this.NET_X;

    if (dist <= 70 && ballOnPlayerSide) {
      if (player === 1) this.dadSwinging = true;
      else this.lillianSwinging = true;

      this.deflectBall(player, px, py);

      this.time.delayedCall(300, () => {
        if (player === 1) this.dadSwinging = false;
        else this.lillianSwinging = false;
      });
    } else {
      this.showMissText(px, py);
    }
  }

  private deflectBall(player: 1 | 2, px: number, py: number): void {
    MusicManager.sfx('hit');
    this.netHits = 0; // successful hit resets net counter
    // Increase rally speed
    this.rallySpeed = Math.min(this.MAX_RALLY_SPEED, this.rallySpeed + this.RALLY_INCREMENT);

    const dir = player === 1 ? 1 : -1;
    this.ballVX = this.rallySpeed * dir;

    // Vertical deflection based on player y vs ball y
    const yDiff = py - this.ballY; // positive = ball is above player center
    if (yDiff > 10) {
      // Ball above player — deflect upward
      this.ballVY = -(200 + Math.random() * 100);
    } else if (yDiff < -10) {
      // Ball below player — flat/downward
      this.ballVY = -50 + Math.random() * 100;
    } else {
      // Even — moderate upward
      this.ballVY = -120 + (Math.random() - 0.5) * 80;
    }

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

  private showSwingArc(px: number, py: number, _player: 1 | 2): void {
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
      targets: this.swingArc, alpha: 0, duration: 250,
      onComplete: () => { this.swingArc.setAlpha(1); this.swingArc.clear(); },
    });
  }

  private showMissText(px: number, py: number): void {
    const miss = this.add.text(px, py - 40, 'Miss!', {
      fontSize: '22px', color: '#ff4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(220);

    this.tweens.add({
      targets: miss, y: py - 90, alpha: 0,
      duration: 700, ease: 'Power2',
      onComplete: () => miss.destroy(),
    });
  }

  // ─── AI ────────────────────────────────────────────────────────────────────

  private updateAI(delta: number): void {
    const AI_SPEED = 200;        // px/s
    const REACTION_MS = 120;     // ms delay before AI responds
    const MISS_CHANCE = 0.15;    // 15% miss or mis-time

    // Track ball Y with lag
    const diff = this.ballY - this.lillianY;
    if (Math.abs(diff) > 8) {
      this.lillianY += Math.sign(diff) * Math.min(Math.abs(diff), AI_SPEED * delta / 1000);
      this.lillianY = Phaser.Math.Clamp(this.lillianY, this.CEILING_Y + 60, this.FLOOR_Y - 40);
    }

    if (!this.pointInProgress) return;

    // Queue swing when ball is close and on Lillian's side moving toward her
    if (!this.aiSwingQueued) {
      const dist = Phaser.Math.Distance.Between(this.lillianX, this.lillianY, this.ballX, this.ballY);
      const ballComingToward = this.ballVX > 0; // positive = moving right = toward Lillian
      if (dist < 90 && this.ballX > this.NET_X && ballComingToward) {
        this.aiSwingQueued = true;
        this.time.delayedCall(REACTION_MS, () => {
          this.aiSwingQueued = false;
          if (!this.pointInProgress) return;
          if (Math.random() < MISS_CHANCE) {
            // AI misses
            this.showMissText(this.lillianX, this.lillianY);
            return;
          }
          const dist2 = Phaser.Math.Distance.Between(this.lillianX, this.lillianY, this.ballX, this.ballY);
          if (dist2 < 100 && this.ballX > this.NET_X) {
            this.trySwing(2);
          }
        });
      }
    }
  }

  // ─── 2P Lillian input ──────────────────────────────────────────────────────

  private updateLillian2P(delta: number): void {
    const SPEED = 220;
    if (this.keyI?.isDown) {
      this.lillianY = Phaser.Math.Clamp(this.lillianY - SPEED * delta / 1000, this.CEILING_Y + 60, this.FLOOR_Y - 40);
    }
    if (this.keyK?.isDown) {
      this.lillianY = Phaser.Math.Clamp(this.lillianY + SPEED * delta / 1000, this.CEILING_Y + 60, this.FLOOR_Y - 40);
    }
    if (this.keyN && Phaser.Input.Keyboard.JustDown(this.keyN)) {
      this.trySwing(2);
    }
  }

  // ─── Scoring ───────────────────────────────────────────────────────────────

  private scorePoint(player: 1 | 2): void {
    if (!this.pointInProgress) return;
    this.pointInProgress = false;
    MusicManager.sfx('point');
    this.addScore(player);
    this.servingPlayer = player === 1 ? 2 : 1;

    const label = player === 1 ? `Point — ${this.dadName}!` : `Point — ${this.lillianName}!`;
    this.showPointBanner(label);

    this.time.delayedCall(1500, () => {
      if (this.gameActive) this.beginServe();
    });
  }

  private showPointBanner(label: string): void {
    this.pointBannerText.setText(label);
    this.pointBannerText.setVisible(true).setAlpha(1).setScale(1);

    this.tweens.add({
      targets: this.pointBannerText, scaleX: 1.25, scaleY: 1.25,
      duration: 250, yoyo: true,
    });

    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: this.pointBannerText, alpha: 0, duration: 200,
        onComplete: () => {
          this.pointBannerText.setVisible(false).setAlpha(1);
        },
      });
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    this.checkEscape();
    if (!this.gameActive) return;

    const dt = delta / 1000;
    const PLAYER_SPEED = 220;

    // ── Dad movement (UP/DOWN arrows or W/S) ──────────────────────────────
    if (this.keyUp?.isDown || this.keyW?.isDown) {
      this.dadY = Phaser.Math.Clamp(this.dadY - PLAYER_SPEED * dt, this.CEILING_Y + 60, this.FLOOR_Y - 40);
    }
    if (this.keyDown?.isDown || this.keyS?.isDown) {
      this.dadY = Phaser.Math.Clamp(this.dadY + PLAYER_SPEED * dt, this.CEILING_Y + 60, this.FLOOR_Y - 40);
    }

    // ── Dad swing (SPACE) ────────────────────────────────────────────────
    if (this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      if (this.gameStarted && !this.serving) {
        this.trySwing(1);
      }
    }

    // ── Lillian: AI or 2P ────────────────────────────────────────────────
    if (this.twoPlayer) {
      this.updateLillian2P(delta);
    } else {
      this.updateAI(delta);
    }

    // ── Update character visuals ─────────────────────────────────────────
    this.dadContainer.setPosition(this.dadX, this.dadY);
    this.lillianContainer.setPosition(this.lillianX, this.lillianY);

    // ── Snap ball to server while serving ────────────────────────────────
    if (this.serving) {
      if (this.servingPlayer === 1) {
        this.ballX = this.dadX + 35;
        this.ballY = this.dadY - 20;
      } else {
        this.ballX = this.lillianX - 35;
        this.ballY = this.lillianY - 20;
      }
      this.drawBall();
      return;
    }

    if (!this.pointInProgress) {
      this.drawBall();
      return;
    }

    // ── Ball physics ─────────────────────────────────────────────────────
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Gravity
    this.ballVY += this.GRAVITY * dt;

    // Trail
    this.ballTrail.push({ x: this.ballX, y: this.ballY, alpha: 0.65 });
    if (this.ballTrail.length > 7) this.ballTrail.shift();
    for (const t of this.ballTrail) t.alpha *= 0.78;

    // ── Floor bounce ─────────────────────────────────────────────────────
    if (this.ballY + this.BALL_R > this.FLOOR_Y) {
      this.ballY = this.FLOOR_Y - this.BALL_R;
      this.ballVY = -Math.abs(this.ballVY) * this.BOUNCE_Y;
      MusicManager.sfx('bounce');

      // Dust puff
      const puff = this.add.graphics();
      puff.fillStyle(0xffffff, 0.35);
      puff.fillEllipse(this.ballX, this.FLOOR_Y, 20, 7);
      puff.setDepth(8);
      this.tweens.add({
        targets: puff, alpha: 0, scaleX: 2.5, scaleY: 0.4,
        duration: 240, onComplete: () => puff.destroy(),
      });
    }

    // ── Ceiling bounce ───────────────────────────────────────────────────
    if (this.ballY - this.BALL_R < this.CEILING_Y) {
      this.ballY = this.CEILING_Y + this.BALL_R;
      this.ballVY = Math.abs(this.ballVY) * 0.8;
    }

    // ── Net collision ────────────────────────────────────────────────────
    if (this.ballY + this.BALL_R > this.NET_TOP_Y) {
      let hitNet = false;
      if (this.ballVX > 0
        && this.ballX + this.BALL_R >= this.NET_X - this.NET_HALF_W
        && this.ballX < this.NET_X) {
        // Moving right, hit left face
        this.ballX = this.NET_X - this.NET_HALF_W - this.BALL_R - 2;
        this.ballVX = -Math.max(120, Math.abs(this.ballVX) * 0.5);
        this.ballVY = -Math.abs(this.ballVY * 0.75) - 60;
        hitNet = true;
      } else if (this.ballVX < 0
        && this.ballX - this.BALL_R <= this.NET_X + this.NET_HALF_W
        && this.ballX > this.NET_X) {
        // Moving left, hit right face
        this.ballX = this.NET_X + this.NET_HALF_W + this.BALL_R + 2;
        this.ballVX = Math.max(120, Math.abs(this.ballVX) * 0.5);
        this.ballVY = -Math.abs(this.ballVY * 0.75) - 60;
        hitNet = true;
      }

      if (hitNet) {
        this.netHits++;
        if (this.netHits >= 2) {
          this.netHits = 0;
          this.pointInProgress = false;
          const fault = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Net Fault!', {
            fontSize: '28px', color: '#ff8800', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(210);
          this.time.delayedCall(1200, () => {
            fault.destroy();
            if (this.gameActive) this.beginServe();
          });
        }
      }
    }

    // ── Stuck-ball minimum speed check near net ───────────────────────────
    if (this.pointInProgress
      && Math.abs(this.ballX - this.NET_X) < 30
      && Math.abs(this.ballVX) + Math.abs(this.ballVY) < 50) {
      this.netHits = 0;
      this.pointInProgress = false;
      const fault = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Net Fault!', {
        fontSize: '28px', color: '#ff8800', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(210);
      this.time.delayedCall(1200, () => {
        fault.destroy();
        if (this.gameActive) this.beginServe();
      });
    }

    // ── Out of bounds scoring ────────────────────────────────────────────
    // Ball past left wall → Lillian scores
    if (this.ballX - this.BALL_R < this.LEFT_WALL) {
      this.ballX = this.LEFT_WALL + this.BALL_R;
      this.scorePoint(2);
    }
    // Ball past right wall → Dad scores
    if (this.ballX + this.BALL_R > this.RIGHT_WALL) {
      this.ballX = this.RIGHT_WALL - this.BALL_R;
      this.scorePoint(1);
    }

    this.drawBall();
  }

  // ─── Draw ball ─────────────────────────────────────────────────────────────

  private drawBall(): void {
    this.ballGfx.clear();

    // Trail
    for (const t of this.ballTrail) {
      this.ballGfx.fillStyle(0xc8e600, t.alpha * 0.45);
      this.ballGfx.fillCircle(t.x, t.y, this.BALL_R * 0.7);
    }

    // Shadow on floor
    this.ballGfx.fillStyle(0x000000, 0.2);
    this.ballGfx.fillEllipse(this.ballX, this.FLOOR_Y - 1, 18, 5);

    // Ball
    this.ballGfx.fillStyle(0xc8e600, 1);
    this.ballGfx.fillCircle(this.ballX, this.ballY, this.BALL_R);

    // Seam
    this.ballGfx.lineStyle(1.5, 0x889900, 0.65);
    this.ballGfx.beginPath();
    this.ballGfx.arc(this.ballX - 3, this.ballY, 5, -0.5, 0.5);
    this.ballGfx.strokePath();
  }

  // ─── Exit ──────────────────────────────────────────────────────────────────

  protected async exitToHub(): Promise<void> {
    this.transitioning = true;
    this.gameActive = false;
    MusicManager.stopMusic();
    await super.exitToHub();
  }
}
