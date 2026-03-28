import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';
import { SceneTransition } from '../../systems/SceneTransition';

type KickStep = 'move' | 'aim' | 'power' | 'kick' | 'result' | 'end';

export class SoccerScene extends BaseMiniGameScene {
  protected gameName = 'soccer';

  private stepState: KickStep = 'move';
  private shooterX = GAME_WIDTH / 2;
  private goalieX = GAME_WIDTH / 2;
  private goalY = 120;
  private goalLeft = GAME_WIDTH / 2 - 90;
  private goalRight = GAME_WIDTH / 2 + 90;
  private goalWidth = 180;

  private aimAngle = 0;
  private aimDir = 1;
  private powerLevel = 0;
  private powerDir = 1;

  private ballX = GAME_WIDTH / 2;
  private ballY = GAME_HEIGHT - 140;
  private ballVX = 0;
  private ballVY = 0;
  private ballActive = false;

  private dadGoals = 0;
  private lillianGoals = 0;
  private kicksRemaining = 5;
  private isPlayerShooting = true;
  private round = 1;

  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;
  private ballGfx!: Phaser.GameObjects.Graphics;
  private aimArrow!: Phaser.GameObjects.Graphics;
  private powerBar!: Phaser.GameObjects.Graphics;
  private goalieGfx!: Phaser.GameObjects.Container;
  private kicksText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;

  private spaceKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  private transitioning = false;

  constructor() { super({ key: 'SoccerScene' }); }

  create(): void {
    this.score1 = 0;
    this.score2 = 0;
    this.dadGoals = 0;
    this.lillianGoals = 0;
    this.kicksRemaining = 5;
    this.isPlayerShooting = true;
    this.round = 1;
    this.stepState = 'move';
    this.transitioning = false;

    this.createField();
    this.createGoalie();
    this.createCharacters();
    this.createHUD('Dad Goals', 'Lillian Goals');
    this.createUI();
    this.setupInput();
    this.startRound();
  }

  private createField(): void {
    // Grass
    const g = this.add.graphics();
    g.fillStyle(0x2e7d32);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Field markings
    g.lineStyle(2, 0x4caf50, 0.8);
    for (let y = 0; y < GAME_HEIGHT; y += 60) {
      g.fillStyle(y % 120 === 0 ? 0x2e7d32 : 0x33882e);
      g.fillRect(0, y, GAME_WIDTH, 60);
    }

    // Penalty arc
    g.lineStyle(3, 0xffffff, 0.6);
    g.strokeCircle(GAME_WIDTH / 2, this.ballY - 20, 70);
    g.lineBetween(GAME_WIDTH / 2 - 100, this.ballY - 20, GAME_WIDTH / 2 + 100, this.ballY - 20);

    // Penalty spot
    g.fillStyle(0xffffff);
    g.fillCircle(GAME_WIDTH / 2, this.ballY, 5);

    // Goal area
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRect(this.goalLeft - 20, this.goalY - 10, this.goalWidth + 40, 50);

    // Goal net
    if (this.textures.exists('soccer_goal')) {
      this.add.image(GAME_WIDTH / 2, this.goalY + 20, 'soccer_goal').setScale(this.goalWidth / 80 + 0.2, 1.2);
    } else {
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(this.goalLeft, this.goalY, this.goalWidth, 50);
      g.lineStyle(2, 0xffffff, 0.7);
      g.strokeRect(this.goalLeft, this.goalY, this.goalWidth, 50);
    }

    // Ball
    this.ballGfx = this.add.graphics();
    this.ballGfx.setDepth(10);

    // Aim arrow
    this.aimArrow = this.add.graphics();
    this.aimArrow.setDepth(8);
    this.aimArrow.setVisible(false);

    // Power bar
    this.powerBar = this.add.graphics();
    this.powerBar.setDepth(8);
    this.powerBar.setVisible(false);
  }

  private createGoalie(): void {
    const state = SaveManager.load();
    this.goalieGfx = CharacterRenderer.create(
      this, this.goalieX, this.goalY + 60,
      state.lillianConfig, 1.2
    );
    this.goalieGfx.setDepth(5);
    this.goalieX = GAME_WIDTH / 2;
  }

  private createCharacters(): void {
    const state = SaveManager.load();
    this.dadContainer = CharacterRenderer.create(
      this, this.shooterX, this.ballY + 50,
      state.dadConfig, 1.5
    );
    this.dadContainer.setDepth(5);

    // Lillian stands aside watching when dad shoots
    this.lillianContainer = CharacterRenderer.create(
      this, 60, GAME_HEIGHT - 100,
      state.lillianConfig, 1.2
    );
    this.lillianContainer.setDepth(5);
  }

  private createUI(): void {
    this.kicksText = this.add.text(GAME_WIDTH / 2, 60, 'Kicks: 5', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    this.roundText = this.add.text(GAME_WIDTH / 2, 80, 'Round 1 - Dad Shoots', {
      fontSize: '13px', color: '#aaffaa',
    }).setOrigin(0.5).setDepth(101);

    this.instructionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '← → Move | SPACE Aim', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(101);
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }
  }

  private startRound(): void {
    this.stepState = 'move';
    this.shooterX = GAME_WIDTH / 2;
    this.ballX = GAME_WIDTH / 2;
    this.ballY = GAME_HEIGHT - 140;
    this.ballActive = false;
    this.aimAngle = 0;
    this.aimDir = 1;
    this.powerLevel = 0;
    this.powerDir = 1;

    this.goalieX = GAME_WIDTH / 2;
    this.goalieGfx.setPosition(this.goalieX, this.goalY + 60);

    this.dadContainer.setPosition(this.shooterX, this.ballY + 50);
    this.instructionText.setText('\u2190 \u2192 Move position | SPACE to confirm');
    this.kicksText.setText('Kicks: ' + this.kicksRemaining);
    this.roundText.setText('Round ' + this.round + (this.isPlayerShooting ? ' - Dad Shoots' : ' - Lillian Shoots'));
  }

  private confirmPosition(): void {
    this.stepState = 'aim';
    this.aimArrow.setVisible(true);
    this.instructionText.setText('Watch the arrow... SPACE to aim!');
  }

  private confirmAim(): void {
    this.stepState = 'power';
    this.powerBar.setVisible(true);
    this.instructionText.setText('Watch the power bar... SPACE to kick!');
  }

  private confirmPower(): void {
    this.stepState = 'kick';
    this.ballActive = true;
    this.aimArrow.setVisible(false);
    this.powerBar.setVisible(false);

    const targetX = this.goalLeft + this.goalWidth * ((this.aimAngle + 1) / 2);
    const dx = targetX - this.ballX;
    const dy = this.goalY - this.ballY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 300 + this.powerLevel * 400;

    this.ballVX = (dx / dist) * speed;
    this.ballVY = (dy / dist) * speed;

    // Goalie dive
    if (this.isPlayerShooting) {
      const error = (this.score1 / Math.max(1, this.kicksRemaining + this.score1) >= 0.6) ? 0.5 : 0.3;
      const predicted = targetX + (Math.random() - 0.5) * this.goalWidth * error;
      const goalieTarget = Phaser.Math.Clamp(predicted, this.goalLeft + 10, this.goalRight - 10);
      this.tweens.add({
        targets: this.goalieGfx,
        x: goalieTarget,
        duration: 600,
        ease: 'Power2',
      });
    }

    this.instructionText.setText('');
  }

  private checkGoal(): void {
    if (this.ballY <= this.goalY + 50 && this.ballX >= this.goalLeft && this.ballX <= this.goalRight) {
      // Check if goalie saved it
      const goalieReach = 30;
      const goalieHit = Math.abs(this.ballX - this.goalieGfx.x) < goalieReach && Math.abs(this.ballY - (this.goalY + 60)) < goalieReach;

      if (!goalieHit) {
        // GOAL!
        this.ballActive = false;
        this.stepState = 'result';
        if (this.isPlayerShooting) {
          this.dadGoals++;
          this.addScore(1);
        } else {
          this.lillianGoals++;
          this.addScore(2);
        }
        this.showResult('GOAL!', 0xffd700);
      } else {
        // Saved!
        this.ballActive = false;
        this.stepState = 'result';
        this.showResult('SAVED!', 0xe74c3c);
      }
    } else if (this.ballY <= this.goalY) {
      // Missed
      this.ballActive = false;
      this.stepState = 'result';
      this.showResult('MISS!', 0x95a5a6);
    }
  }

  private showResult(text: string, color: number): void {
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
      fontSize: '52px', fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(200);

    this.time.delayedCall(1200, () => {
      txt.destroy();
      this.kicksRemaining--;

      if (this.kicksRemaining <= 0) {
        this.swapRoles();
      } else {
        this.startRound();
      }
    });
  }

  private swapRoles(): void {
    if (this.round >= 2) {
      // Game over
      this.showFinalScore();
    } else {
      this.round++;
      this.kicksRemaining = 5;
      this.isPlayerShooting = !this.isPlayerShooting;
      this.startRound();
    }
  }

  private showFinalScore(): void {
    this.stepState = 'end';
    this.gameActive = false;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(60, GAME_HEIGHT / 2 - 100, GAME_WIDTH - 120, 240);
    bg.setDepth(300);

    const winner = this.dadGoals > this.lillianGoals ? 'Dad wins!' : this.lillianGoals > this.dadGoals ? 'Lillian wins!' : 'It\'s a tie!';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, winner, {
      fontSize: '32px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, `Dad: ${this.dadGoals}  Lillian: ${this.lillianGoals}`, {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301);

    // Play again
    const playAgain = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Play Again', {
      fontSize: '20px', color: '#2ecc71',
      backgroundColor: '#1a4a2e', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(301).setInteractive({ useHandCursor: true });
    playAgain.on('pointerdown', () => this.scene.restart());

    const homeBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'Go Home', {
      fontSize: '20px', color: '#e74c3c',
      backgroundColor: '#4a1a1a', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(301).setInteractive({ useHandCursor: true });
    homeBtn.on('pointerdown', () => {
      if (!this.transitioning) {
        this.transitioning = true;
        SceneTransition.switchScene(this, 'HubScene');
      }
    });
  }

  update(_time: number, delta: number): void {
    if (this.stepState === 'end' || this.stepState === 'result') return;
    const dt = delta / 1000;

    // Step: move
    if (this.stepState === 'move') {
      if (this.leftKey?.isDown) {
        this.shooterX = Phaser.Math.Clamp(this.shooterX - 200 * dt, this.goalLeft - 20, this.goalRight + 20);
      }
      if (this.rightKey?.isDown) {
        this.shooterX = Phaser.Math.Clamp(this.shooterX + 200 * dt, this.goalLeft - 20, this.goalRight + 20);
      }
      this.ballX = this.shooterX;
      this.dadContainer.setX(this.shooterX);

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.confirmPosition();
      }
    }

    // Step: aim
    if (this.stepState === 'aim') {
      this.aimAngle += this.aimDir * 2.2 * dt;
      if (this.aimAngle > 1) { this.aimAngle = 1; this.aimDir = -1; }
      if (this.aimAngle < -1) { this.aimAngle = -1; this.aimDir = 1; }

      // Draw aim arrow
      this.aimArrow.clear();
      const targetX = this.goalLeft + this.goalWidth * ((this.aimAngle + 1) / 2);
      this.aimArrow.lineStyle(3, 0xffd700, 0.9);
      this.aimArrow.lineBetween(this.ballX, this.ballY, targetX, this.goalY + 25);
      this.aimArrow.fillStyle(0xffd700);
      this.aimArrow.fillTriangle(targetX, this.goalY + 10, targetX - 8, this.goalY + 30, targetX + 8, this.goalY + 30);

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.confirmAim();
      }
    }

    // Step: power
    if (this.stepState === 'power') {
      this.powerLevel += this.powerDir * 1.5 * dt;
      if (this.powerLevel > 1) { this.powerLevel = 1; this.powerDir = -1; }
      if (this.powerLevel < 0) { this.powerLevel = 0; this.powerDir = 1; }

      // Draw power bar
      this.powerBar.clear();
      const barX = 30;
      const barY = GAME_HEIGHT - 80;
      const barW = GAME_WIDTH - 60;
      const barH = 20;
      this.powerBar.fillStyle(0x2c3e50);
      this.powerBar.fillRect(barX, barY, barW, barH);
      const pColor = this.powerLevel > 0.7 ? 0xe74c3c : this.powerLevel > 0.4 ? 0xf39c12 : 0x2ecc71;
      this.powerBar.fillStyle(pColor);
      this.powerBar.fillRect(barX, barY, barW * this.powerLevel, barH);
      this.powerBar.lineStyle(2, 0xffffff, 0.6);
      this.powerBar.strokeRect(barX, barY, barW, barH);

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.confirmPower();
      }
    }

    // Step: kick (ball flying)
    if (this.stepState === 'kick' && this.ballActive) {
      this.ballX += this.ballVX * dt;
      this.ballY += this.ballVY * dt;
      this.checkGoal();
    }

    // Draw ball
    this.ballGfx.clear();
    this.ballGfx.fillStyle(0xffffff);
    this.ballGfx.fillCircle(this.ballX, this.ballY, 12);
    this.ballGfx.fillStyle(0x222222);
    // Simple pentagon patches
    this.ballGfx.fillCircle(this.ballX, this.ballY, 4);
    this.ballGfx.fillStyle(0x000000, 0.2);
    this.ballGfx.fillEllipse(this.ballX, this.ballY + 14, 18, 5);
  }
}
