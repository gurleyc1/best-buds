import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';

// Character hit-zone constants
const CHAR_WIDTH_RANGE = 80;   // horizontal radius around character for hit detection
const CHAR_REACH_UP   = 150;   // how far above character's head is reachable

export class KeepyUppyScene extends BaseMiniGameScene {
  protected gameName = 'keepy_uppy';

  // Balloon physics state
  private ballX = GAME_WIDTH / 2;
  private ballY = 0;
  private ballVX = 0;
  private ballVY = 0;
  private readonly ballR = 22;
  private readonly gravityY = 50;

  // Wind
  private windValue = 0;
  private windDir = 1;
  private windTimer = 0;
  private windDirTimer = 0;
  private windText!: Phaser.GameObjects.Text;

  // Score / game state
  private hits = 0;
  private hitsText!: Phaser.GameObjects.Text;

  // Character positions (x only – y is always groundY)
  private dadX = 80;
  private lillianX = GAME_WIDTH - 80;
  private readonly groundY: number = GAME_HEIGHT - 80;

  // Graphics
  private ballGfx!: Phaser.GameObjects.Graphics;
  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;

  // Keyboard keys
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  constructor() { super({ key: 'KeepyUppyScene' }); }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  create(): void {
    // Reset state
    this.score1    = 0;
    this.hits      = 0;
    this.ballX     = GAME_WIDTH / 2;
    this.ballY     = this.groundY - 250;
    this.ballVX    = (Math.random() - 0.5) * 30;
    this.ballVY    = -80;
    this.windValue = 0;
    this.windDir   = 1;
    this.windTimer = 0;
    this.windDirTimer = 0;
    this.dadX      = 80;
    this.lillianX  = GAME_WIDTH - 80;

    this.createBackground();
    this.createCharacters();
    this.createHUD('Hits');
    this.createBallAndUI();
    this.setupInput();
    this.gameActive = true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Background
  // ─────────────────────────────────────────────────────────────────────────────

  private createBackground(): void {
    const bg = this.add.graphics();

    // Sky gradient
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xc9e8f9, 0xc9e8f9, 1);
    bg.fillRect(0, 0, GAME_WIDTH, this.groundY);

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

    // Trees
    this.drawTree(bg, 30,  this.groundY - 20);
    this.drawTree(bg, 62,  this.groundY + 10);
    this.drawTree(bg, GAME_WIDTH - 50, this.groundY - 10);
    this.drawTree(bg, GAME_WIDTH - 18, this.groundY + 15);

    // Ground (grass strip)
    bg.fillStyle(0x4caf50);
    bg.fillRect(0, this.groundY - 20, GAME_WIDTH, GAME_HEIGHT - (this.groundY - 20));
    bg.fillStyle(0x388e3c);
    bg.fillRect(0, this.groundY - 20, GAME_WIDTH, 20);
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

  // ─────────────────────────────────────────────────────────────────────────────
  //  Characters
  // ─────────────────────────────────────────────────────────────────────────────

  private createCharacters(): void {
    const state = SaveManager.load();

    this.dadContainer = CharacterRenderer.create(
      this, this.dadX, this.groundY, state.dadConfig, 1.8
    );
    this.dadContainer.setDepth(5);

    this.lillianContainer = CharacterRenderer.create(
      this, this.lillianX, this.groundY, state.lillianConfig, 1.5
    );
    this.lillianContainer.setDepth(5);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Ball & HUD
  // ─────────────────────────────────────────────────────────────────────────────

  private createBallAndUI(): void {
    this.ballGfx = this.add.graphics();
    this.ballGfx.setDepth(10);

    // "Hits: X" – prominent centre-top
    this.hitsText = this.add.text(GAME_WIDTH / 2, 30, 'Hits: 0', {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);

    // Wind indicator text – left side, below HUD
    this.windText = this.add.text(10, 56, '', {
      fontSize: '14px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setDepth(101);

    // Instruction footer
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30,
      'Tap left = move Dad  |  Tap right = move Lillian',
      {
        fontSize: '12px', color: '#ffffff',
        backgroundColor: '#00000066', padding: { x: 8, y: 3 },
      }
    ).setOrigin(0.5).setDepth(101);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Input
  // ─────────────────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.gameActive) return;

      const tapX = ptr.x;
      const tapY = ptr.y;

      // Move the correct character toward the tap
      if (tapX < GAME_WIDTH / 2) {
        this.moveCharacter('dad', tapX);
      } else {
        this.moveCharacter('lillian', tapX);
      }

      // Hit detection: balloon must be ABOVE tap and near a character
      if (this.ballY >= tapY) return;   // balloon not above the tap

      // Check each character for proximity
      const dadDx = Math.abs(this.ballX - this.dadX);
      const lilDx = Math.abs(this.ballX - this.lillianX);

      // Head of character is roughly 80px above groundY (at scale 1.8/1.5)
      const dadHeadY   = this.groundY - 80;
      const lillHeadY  = this.groundY - 65;

      const dadReachable  = dadDx  <= CHAR_WIDTH_RANGE && this.ballY >= dadHeadY  - CHAR_REACH_UP;
      const lilReachable  = lilDx  <= CHAR_WIDTH_RANGE && this.ballY >= lillHeadY - CHAR_REACH_UP;

      if (dadReachable || lilReachable) {
        // Animate the character(s) that can reach it
        if (dadReachable)  this.animateHit(this.dadContainer);
        if (lilReachable)  this.animateHit(this.lillianContainer);
        this.hitBalloon(tapX);
      }
    });

    // Keyboard: LEFT/A moves Dad toward balloon, RIGHT/D moves Lillian toward balloon
    // SPACE tries to hit balloon with whichever character is closer
    if (this.input.keyboard) {
      this.keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.keyA     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

      this.input.keyboard.on('keydown-SPACE', () => {
        if (!this.gameActive) return;
        // Move the closer character under the balloon then try hit
        const dadDist = Math.abs(this.ballX - this.dadX);
        const lilDist = Math.abs(this.ballX - this.lillianX);
        if (dadDist < lilDist) {
          this.moveCharacter('dad', this.ballX);
        } else {
          this.moveCharacter('lillian', this.ballX);
        }
        // Simulate a tap at balloon position
        const fakeX = this.ballX;
        const dadDx = Math.abs(this.ballX - this.dadX);
        const lilDx = Math.abs(this.ballX - this.lillianX);
        const dadHeadY = this.groundY - 80;
        const lillHeadY = this.groundY - 65;
        const dadReachable = dadDx <= CHAR_WIDTH_RANGE && this.ballY >= dadHeadY - CHAR_REACH_UP;
        const lilReachable = lilDx <= CHAR_WIDTH_RANGE && this.ballY >= lillHeadY - CHAR_REACH_UP;
        if (dadReachable || lilReachable) {
          if (dadReachable) this.animateHit(this.dadContainer);
          if (lilReachable) this.animateHit(this.lillianContainer);
          this.hitBalloon(fakeX);
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Game logic
  // ─────────────────────────────────────────────────────────────────────────────

  private moveCharacter(who: 'dad' | 'lillian', targetX: number): void {
    // Clamp to screen with a small margin
    const clampedX = Phaser.Math.Clamp(targetX, 30, GAME_WIDTH - 30);
    if (who === 'dad') {
      this.dadX = clampedX;
      this.tweens.add({
        targets: this.dadContainer,
        x: clampedX,
        duration: 120,
        ease: 'Power1',
      });
    } else {
      this.lillianX = clampedX;
      this.tweens.add({
        targets: this.lillianContainer,
        x: clampedX,
        duration: 120,
        ease: 'Power1',
      });
    }
  }

  private animateHit(container: Phaser.GameObjects.Container): void {
    const baseY = this.groundY;
    this.tweens.add({
      targets: container,
      y: baseY - 8,
      duration: 80,
      ease: 'Power1',
      yoyo: true,
      onComplete: () => container.setY(baseY),
    });
  }

  private hitBalloon(tapX: number): void {
    this.hits++;
    this.score1 = this.hits;
    this.scoreText1?.setText(String(this.hits));
    this.hitsText.setText('Hits: ' + this.hits);

    // Always upward – strong random pop
    const upForce = 280 + Math.random() * 170;
    const hPush   = (tapX - this.ballX) * 0.1 + (Math.random() - 0.5) * 40;

    this.ballVY = -upForce;          // always negative (upward)
    this.ballVX = Phaser.Math.Clamp(this.ballVX + hPush, -180, 180);

    // Scale-squash pulse on balloon graphic
    this.tweens.add({
      targets: this.ballGfx,
      scaleX: 1.2, scaleY: 0.82,
      duration: 90,
      yoyo: true,
    });

    if (this.hits % 10 === 0) {
      this.showCelebration('\u2B50 ' + this.hits + ' hits! \u2B50');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Wind system
  // ─────────────────────────────────────────────────────────────────────────────

  private updateWind(delta: number): void {
    this.windTimer    += delta / 1000;
    this.windDirTimer += delta / 1000;

    // Increase wind strength every 30 s, max 2.5
    if (this.windTimer >= 30) {
      this.windTimer = 0;
      this.windValue = Math.min(2.5, this.windValue + 0.3);
    }

    // Reverse direction every 45 s
    if (this.windDirTimer >= 45) {
      this.windDirTimer = 0;
      this.windDir *= -1;
    }
  }

  private updateWindIndicator(): void {
    if (this.windValue <= 0) {
      this.windText.setText('');
      return;
    }
    const arrowCount = Math.ceil(this.windValue);
    const arrow      = this.windDir > 0 ? '→' : '←';
    const arrows     = arrow.repeat(arrowCount);

    let color = '#ffffff';
    if (this.windValue > 2.0) color = '#ff6b6b';
    else if (this.windValue > 1.0) color = '#ffa500';

    this.windText.setText('\uD83D\uDCA8 ' + arrows).setColor(color);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Update loop
  // ─────────────────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;
    const dt = delta / 1000;

    // Keyboard movement for characters
    const moveSpeed = 220 * dt;
    if (this.keyLeft?.isDown || this.keyA?.isDown) {
      this.dadX = Phaser.Math.Clamp(this.dadX - moveSpeed, 30, GAME_WIDTH / 2 - 10);
      this.dadContainer.setX(this.dadX);
    }
    if (this.keyRight?.isDown || this.keyD?.isDown) {
      this.lillianX = Phaser.Math.Clamp(this.lillianX + moveSpeed, GAME_WIDTH / 2 + 10, GAME_WIDTH - 30);
      this.lillianContainer.setX(this.lillianX);
    }

    this.updateWind(delta);
    this.updateWindIndicator();

    // Apply wind (horizontal force each frame)
    this.ballVX += this.windDir * this.windValue * 25 * dt;

    // Apply gravity
    this.ballVY += this.gravityY * dt;

    // Air drag (light)
    this.ballVX *= (1 - 0.4 * dt);

    // Move balloon
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Wall bounces (horizontal)
    if (this.ballX - this.ballR < 0) {
      this.ballX = this.ballR;
      this.ballVX = Math.abs(this.ballVX) * 0.7;
    }
    if (this.ballX + this.ballR > GAME_WIDTH) {
      this.ballX = GAME_WIDTH - this.ballR;
      this.ballVX = -Math.abs(this.ballVX) * 0.7;
    }

    // Ceiling bounce
    if (this.ballY - this.ballR < 55) {
      this.ballY = 55 + this.ballR;
      this.ballVY = Math.abs(this.ballVY) * 0.4;
    }

    // Ground – no game over, gentle nudge upward
    const groundLine = this.groundY - this.ballR - 5;
    if (this.ballY >= groundLine) {
      this.ballY = groundLine;
      this.ballVY = -200;   // gentle nudge
      this.ballVX *= 0.8;
      this.showGroundMessage();
    }

    this.drawBalloon();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private _groundMsgCooldown = 0;

  private showGroundMessage(): void {
    // Debounce so it doesn't fire every frame
    const now = Date.now();
    if (now - this._groundMsgCooldown < 1500) return;
    this._groundMsgCooldown = now;

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Keep it up! \uD83C\uDF88', {
      fontSize: '26px', color: '#ff69b4', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt,
      y: txt.y - 60,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  private drawBalloon(): void {
    this.ballGfx.clear();
    const r = this.ballR;
    const x = this.ballX;
    const y = this.ballY;

    // String
    this.ballGfx.lineStyle(1.5, 0xaaaaaa, 0.8);
    this.ballGfx.lineBetween(
      x, y + r,
      x + Math.sin(this.ballVX * 0.05) * 8,
      y + r * 2.2
    );

    // Drop shadow
    this.ballGfx.fillStyle(0x000000, 0.12);
    this.ballGfx.fillEllipse(x, y + r + 4, r * 1.5, r * 0.4);

    // Balloon body
    this.ballGfx.fillStyle(COLORS.PINK);
    this.ballGfx.fillEllipse(x, y, r * 2, r * 2.4);

    // Sheen
    this.ballGfx.fillStyle(0xffb3d1, 0.75);
    this.ballGfx.fillEllipse(x - r * 0.3, y - r * 0.35, r * 0.7, r * 0.9);
    this.ballGfx.fillStyle(0xffffff, 0.5);
    this.ballGfx.fillEllipse(x - r * 0.25, y - r * 0.3, r * 0.3, r * 0.45);

    // Knot
    this.ballGfx.fillStyle(0xff1493);
    this.ballGfx.fillTriangle(
      x - 4, y + r,
      x + 4, y + r,
      x,     y + r * 1.35
    );
  }
}
