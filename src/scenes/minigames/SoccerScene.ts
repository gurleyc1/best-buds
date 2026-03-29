import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';
import { SceneTransition } from '../../systems/SceneTransition';
import { MusicManager } from '../../systems/MusicManager';

type KickStep = 'move' | 'aim' | 'power' | 'kick' | 'result' | 'end';

export class SoccerScene extends BaseMiniGameScene {
  protected gameName = 'soccer';

  private stepState: KickStep = 'move';
  private shooterX = GAME_WIDTH / 2;

  // Goal at y=120, penalty spot at y=420
  private readonly GOAL_Y = 120;
  private readonly PENALTY_Y = 420;
  private readonly GOAL_LEFT = GAME_WIDTH / 2 - 90;
  private readonly GOAL_RIGHT = GAME_WIDTH / 2 + 90;
  private readonly GOAL_WIDTH = 180;

  private goalieX = GAME_WIDTH / 2;
  private goalieMoving = false;
  private goalieTargetX = GAME_WIDTH / 2;

  private aimAngle = 0;
  private aimDir = 1;
  private powerLevel = 0;
  private powerDir = 1;

  private ballX = GAME_WIDTH / 2;
  private ballY = this.PENALTY_Y;
  private ballVX = 0;
  private ballVY = 0;
  private ballActive = false;

  // Ball trail
  private ballTrail: Array<{ x: number; y: number; alpha: number }> = [];

  private dadGoals = 0;
  private lillianGoals = 0;
  private kicksRemaining = 5;
  private isPlayerShooting = true;
  private round = 1;
  private dadName = 'Dad';
  private lillianName = 'Lillian';

  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;
  private ballGfx!: Phaser.GameObjects.Graphics;
  private aimArrow!: Phaser.GameObjects.Graphics;
  private powerBarGfx!: Phaser.GameObjects.Graphics;
  private goalieGfx!: Phaser.GameObjects.Container;    // Lillian as goalie
  private dadGoalieGfx!: Phaser.GameObjects.Container; // Dad as goalie
  private kicksText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;

  // Step instruction panel
  private step1Text!: Phaser.GameObjects.Text;
  private step2Text!: Phaser.GameObjects.Text;
  private step3Text!: Phaser.GameObjects.Text;
  private stepPanel!: Phaser.GameObjects.Graphics;

  private spaceKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  private transitioning = false;

  constructor() { super({ key: 'SoccerScene' }); }

  private get difficultyFactor(): number {
    // Starts at 0.4 (easy), increases to 1.0 by kick 5
    const kicksTaken = 5 - this.kicksRemaining;
    return 0.4 + (kicksTaken / 5) * 0.6;
  }

  create(data?: { returnX?: number; returnY?: number }): void {
    this.captureReturnData(data);
    this.score1 = 0;
    this.score2 = 0;
    this.dadGoals = 0;
    this.lillianGoals = 0;
    this.kicksRemaining = 5;
    this.isPlayerShooting = true;
    this.round = 1;
    this.stepState = 'move';
    this.transitioning = false;
    this.ballTrail = [];

    const state = SaveManager.load();
    this.dadName = state.dadConfig.name || 'Dad';
    this.lillianName = state.lillianConfig.name || 'Lillian';

    this.createField();
    this.createGoalie();
    this.createCharacters();
    this.createHUD(`${this.dadName} Goals`, `${this.lillianName} Goals`);
    this.createUI();
    this.setupInput();
    this.setupEscapeKey();
    this.startRound();
    MusicManager.playTheme('soccer');
    MusicManager.sfx('start');
  }

  private createField(): void {
    const g = this.add.graphics();

    // Grass stripes
    for (let yy = 0; yy < GAME_HEIGHT; yy += 60) {
      g.fillStyle(yy % 120 === 0 ? 0x2e7d32 : 0x33882e);
      g.fillRect(0, yy, GAME_WIDTH, 60);
    }

    // Goal area box
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRect(this.GOAL_LEFT - 20, this.GOAL_Y - 10, this.GOAL_WIDTH + 40, 50);

    // Goal net background
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(this.GOAL_LEFT, this.GOAL_Y, this.GOAL_WIDTH, 50);

    // Goal net grid lines
    g.lineStyle(1, 0xffffff, 0.4);
    for (let nx = this.GOAL_LEFT; nx <= this.GOAL_RIGHT; nx += 18) {
      g.lineBetween(nx, this.GOAL_Y, nx, this.GOAL_Y + 50);
    }
    for (let ny = this.GOAL_Y; ny <= this.GOAL_Y + 50; ny += 12) {
      g.lineBetween(this.GOAL_LEFT, ny, this.GOAL_RIGHT, ny);
    }
    // Goal posts
    g.lineStyle(4, 0xffffff, 1.0);
    g.lineBetween(this.GOAL_LEFT, this.GOAL_Y, this.GOAL_LEFT, this.GOAL_Y + 50);
    g.lineBetween(this.GOAL_RIGHT, this.GOAL_Y, this.GOAL_RIGHT, this.GOAL_Y + 50);
    g.lineBetween(this.GOAL_LEFT, this.GOAL_Y, this.GOAL_RIGHT, this.GOAL_Y);

    // Penalty arc
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeCircle(GAME_WIDTH / 2, this.PENALTY_Y, 70);
    g.lineBetween(GAME_WIDTH / 2 - 100, this.PENALTY_Y, GAME_WIDTH / 2 + 100, this.PENALTY_Y);

    // Penalty spot
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(GAME_WIDTH / 2, this.PENALTY_Y, 6);

    // Ball graphics (drawn in update)
    this.ballGfx = this.add.graphics();
    this.ballGfx.setDepth(10);

    // Aim arrow
    this.aimArrow = this.add.graphics();
    this.aimArrow.setDepth(9);
    this.aimArrow.setVisible(false);

    // Power bar
    this.powerBarGfx = this.add.graphics();
    this.powerBarGfx.setDepth(9);
    this.powerBarGfx.setVisible(false);
  }

  private createGoalie(): void {
    const state = SaveManager.load();
    this.goalieX = GAME_WIDTH / 2;
    this.goalieGfx = CharacterRenderer.create(
      this, this.goalieX, this.GOAL_Y + 35, state.lillianConfig, 1.2
    );
    this.goalieGfx.setDepth(5);
    this.dadGoalieGfx = CharacterRenderer.create(
      this, this.goalieX, this.GOAL_Y + 35, state.dadConfig, 1.2
    );
    this.dadGoalieGfx.setDepth(5);
    this.dadGoalieGfx.setVisible(false);
  }

  private createCharacters(): void {
    const state = SaveManager.load();
    this.dadContainer = CharacterRenderer.create(
      this, this.shooterX, this.PENALTY_Y + 50,
      state.dadConfig, 1.5
    );
    this.dadContainer.setDepth(6);

    // Lillian watches from the side
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

    this.roundText = this.add.text(GAME_WIDTH / 2, 80, `Round 1 - ${this.dadName} Shoots`, {
      fontSize: '13px', color: '#aaffaa',
    }).setOrigin(0.5).setDepth(101);

    // Step instruction panel at bottom
    this.stepPanel = this.add.graphics();
    this.stepPanel.setDepth(102);

    const panelY = GAME_HEIGHT - 130;
    this.step1Text = this.add.text(GAME_WIDTH / 2, panelY + 10, 'Step 1: Move left/right', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#00000077', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(103);

    this.step2Text = this.add.text(GAME_WIDTH / 2, panelY + 40, 'Step 2: Aim — tap SPACE to set direction', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#00000077', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(103);

    this.step3Text = this.add.text(GAME_WIDTH / 2, panelY + 70, 'Step 3: Power — tap SPACE to shoot!', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#00000077', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(103);
  }

  private highlightStep(active: 1 | 2 | 3): void {
    const activeColor = '#ffd700';
    const dimColor = '#888888';

    this.step1Text.setStyle({ color: active === 1 ? activeColor : dimColor, fontSize: '14px', backgroundColor: active === 1 ? '#00000099' : '#00000044', padding: { x: 8, y: 4 } });
    this.step2Text.setStyle({ color: active === 2 ? activeColor : dimColor, fontSize: '14px', backgroundColor: active === 2 ? '#00000099' : '#00000044', padding: { x: 8, y: 4 } });
    this.step3Text.setStyle({ color: active === 3 ? activeColor : dimColor, fontSize: '14px', backgroundColor: active === 3 ? '#00000099' : '#00000044', padding: { x: 8, y: 4 } });

    this.step1Text.setVisible(true);
    this.step2Text.setVisible(true);
    this.step3Text.setVisible(true);
  }

  private hideStepUI(): void {
    this.step1Text.setVisible(false);
    this.step2Text.setVisible(false);
    this.step3Text.setVisible(false);
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }

    this.input.on('pointerdown', () => {
      if (this.stepState === 'move') this.confirmPosition();
      else if (this.stepState === 'aim') this.confirmAim();
      else if (this.stepState === 'power') this.confirmPower();
    });
  }

  private startRound(): void {
    this.stepState = 'move';
    this.shooterX = GAME_WIDTH / 2;
    this.ballX = GAME_WIDTH / 2;
    this.ballY = this.PENALTY_Y;
    this.ballActive = false;
    this.aimAngle = 0;
    this.aimDir = 1;
    this.powerLevel = 0;
    this.powerDir = 1;
    this.ballTrail = [];
    this.goalieMoving = false;

    this.goalieX = GAME_WIDTH / 2;
    this.goalieGfx.setPosition(this.goalieX, this.GOAL_Y + 35);
    this.dadGoalieGfx.setPosition(this.goalieX, this.GOAL_Y + 35);

    this.aimArrow.setVisible(false);
    this.powerBarGfx.setVisible(false);

    // Update which character is at penalty spot vs in goal
    if (this.isPlayerShooting) {
      // Dad shoots, Lillian is goalie
      this.dadContainer.setVisible(true).setPosition(this.shooterX, this.PENALTY_Y + 50);
      this.lillianContainer.setVisible(false);
      this.goalieGfx.setVisible(true).setPosition(GAME_WIDTH / 2, this.GOAL_Y + 35);
      this.dadGoalieGfx.setVisible(false);
    } else {
      // Lillian shoots, Dad is goalie
      this.lillianContainer.setVisible(true).setPosition(this.shooterX, this.PENALTY_Y + 50);
      this.dadContainer.setVisible(false);
      this.dadGoalieGfx.setVisible(true).setPosition(GAME_WIDTH / 2, this.GOAL_Y + 35);
      this.goalieGfx.setVisible(false);
    }

    this.kicksText.setText('Kicks: ' + this.kicksRemaining);
    this.roundText.setText('Round ' + this.round + (this.isPlayerShooting ? ` — ${this.dadName} shoots` : ` — ${this.lillianName} shoots`));

    this.highlightStep(1);
  }

  private confirmPosition(): void {
    this.stepState = 'aim';
    this.aimArrow.setVisible(true);
    this.highlightStep(2);
  }

  private confirmAim(): void {
    this.stepState = 'power';
    this.powerBarGfx.setVisible(true);
    this.highlightStep(3);
  }

  private confirmPower(): void {
    this.stepState = 'kick';
    this.ballActive = true;
    this.aimArrow.setVisible(false);
    this.powerBarGfx.setVisible(false);
    this.hideStepUI();

    // Aim toward goal based on aimAngle (-1..1)
    // aimAngle maps to a position inside the goal
    const targetX = this.GOAL_LEFT + this.GOAL_WIDTH * ((this.aimAngle + 1) / 2);
    const dx = targetX - this.ballX;
    const dy = this.GOAL_Y + 25 - this.ballY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 350 + this.powerLevel * 450;

    this.ballVX = (dx / dist) * speed;
    this.ballVY = (dy / dist) * speed;

    // Goalie reaction — difficulty scales from easy (kick 1) to hard (kick 5)
    if (this.isPlayerShooting) {
      const shotTargetX = targetX;
      const df = this.difficultyFactor;
      const reactionDelay = 200 + (1 - df) * 300; // 500ms early → 200ms later
      this.time.delayedCall(reactionDelay, () => {
        if (this.stepState !== 'kick') return;
        this.goalieMoving = true;
        // Goalie max reach grows with difficulty
        const reachRange = this.GOAL_WIDTH * (0.4 + df * 0.3);
        const distFromCenter = Math.abs(shotTargetX - GAME_WIDTH / 2) / (this.GOAL_WIDTH / 2);
        // Corner miss chance: starts at 0.70 (easy, player has 70% success), drops to 0.45 (hard)
        const cornerMissChance = 0.7 - df * 0.25;
        const errorScale = distFromCenter > 0.6
          ? cornerMissChance
          : 0.05;
        const errorOffset = (Math.random() - 0.5) * this.GOAL_WIDTH * errorScale;
        let goalieTarget = shotTargetX + errorOffset;
        // Clamp to reachable range
        const travelTime = 0.35;
        const maxReach = 240 * travelTime;
        goalieTarget = Phaser.Math.Clamp(
          goalieTarget,
          this.goalieX - maxReach,
          this.goalieX + maxReach
        );
        goalieTarget = Phaser.Math.Clamp(
          goalieTarget,
          shotTargetX - reachRange / 2,
          shotTargetX + reachRange / 2
        );
        goalieTarget = Phaser.Math.Clamp(goalieTarget, this.GOAL_LEFT + 10, this.GOAL_RIGHT - 10);
        this.goalieTargetX = goalieTarget;
        const activeGoalie = this.isPlayerShooting ? this.goalieGfx : this.dadGoalieGfx;
        this.tweens.add({
          targets: activeGoalie,
          x: goalieTarget,
          duration: 350,
          ease: 'Power3',
          onUpdate: () => { this.goalieX = activeGoalie.x; },
        });
      });
    }
  }

  private checkGoal(): void {
    // Check if ball has reached the goal line area
    if (this.ballY <= this.GOAL_Y + 55 && this.ballY >= this.GOAL_Y - 5) {
      if (this.ballX >= this.GOAL_LEFT && this.ballX <= this.GOAL_RIGHT) {
        // Check goalie save
        const goalieReach = 28;
        const goalieHit = Math.abs(this.ballX - this.goalieGfx.x) < goalieReach
          && Math.abs(this.ballY - (this.GOAL_Y + 35)) < goalieReach * 1.5;

        if (!goalieHit) {
          this.ballActive = false;
          this.stepState = 'result';
          if (this.isPlayerShooting) {
            this.dadGoals++;
            this.addScore(1);
          } else {
            this.lillianGoals++;
            this.addScore(2);
          }
          this.showResult('GOAL! ⚽', 0xffd700, true);
        } else {
          this.ballActive = false;
          this.stepState = 'result';
          this.showResult('SAVED!', 0xe74c3c, false);
        }
      } else if (this.ballY <= this.GOAL_Y) {
        // Passed above the goal (miss)
        this.ballActive = false;
        this.stepState = 'result';
        this.showResult('MISS!', 0x95a5a6, false);
      }
    } else if (this.ballY < this.GOAL_Y - 10) {
      // Ball went past/above goal without going in
      this.ballActive = false;
      this.stepState = 'result';
      this.showResult('MISS!', 0x95a5a6, false);
    }
  }

  private showResult(text: string, color: number, isGoal: boolean): void {
    if (isGoal) {
      MusicManager.sfx('goal');
      this.spawnGoalParticles();
    } else if (text === 'SAVED!') {
      MusicManager.sfx('saved');
    } else {
      MusicManager.sfx('miss');
    }

    const fontSize = isGoal ? '60px' : '52px';
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
      fontSize, fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(200);

    if (isGoal) {
      this.tweens.add({
        targets: txt,
        scaleX: 1.3, scaleY: 1.3,
        duration: 300,
        yoyo: true,
        repeat: 1,
      });
    }

    this.time.delayedCall(1400, () => {
      txt.destroy();
      this.kicksRemaining--;

      if (this.kicksRemaining <= 0) {
        this.swapRoles();
      } else {
        this.startRound();
      }
    });
  }

  private spawnGoalParticles(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const colors = [0xffd700, 0xff6600, 0xffffff, 0x00ff88, 0xff4444];

    for (let i = 0; i < 30; i++) {
      const gp = this.add.graphics();
      const c = colors[Math.floor(Math.random() * colors.length)];
      gp.fillStyle(c, 1);
      gp.fillCircle(0, 0, 5 + Math.random() * 5);
      gp.setPosition(cx, cy);
      gp.setDepth(201);

      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 250;
      this.tweens.add({
        targets: gp,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => gp.destroy(),
      });
    }
  }

  private swapRoles(): void {
    if (this.round >= 2) {
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

    const winner = this.dadGoals > this.lillianGoals
      ? `${this.dadName} wins!`
      : this.lillianGoals > this.dadGoals
        ? `${this.lillianName} wins!`
        : "It's a tie!";

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, winner, {
      fontSize: '32px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, `${this.dadName}: ${this.dadGoals}  ${this.lillianName}: ${this.lillianGoals}`, {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301);

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
        this.exitToHub();
      }
    });
  }

  update(_time: number, delta: number): void {
    this.checkEscape();
    if (this.stepState === 'end' || this.stepState === 'result') return;
    const dt = delta / 1000;

    // Step: move
    if (this.stepState === 'move') {
      if (this.leftKey?.isDown) {
        this.shooterX = Phaser.Math.Clamp(
          this.shooterX - 200 * dt,
          this.GOAL_LEFT - 30,
          this.GOAL_RIGHT + 30
        );
      }
      if (this.rightKey?.isDown) {
        this.shooterX = Phaser.Math.Clamp(
          this.shooterX + 200 * dt,
          this.GOAL_LEFT - 30,
          this.GOAL_RIGHT + 30
        );
      }
      this.ballX = this.shooterX;
      this.dadContainer.setX(this.shooterX);

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.confirmPosition();
      }
    }

    // Step: aim — oscillating arrow
    if (this.stepState === 'aim') {
      this.aimAngle += this.aimDir * 2.0 * dt;
      if (this.aimAngle > 1) { this.aimAngle = 1; this.aimDir = -1; }
      if (this.aimAngle < -1) { this.aimAngle = -1; this.aimDir = 1; }

      // Draw aim arrow (dotted preview line)
      this.aimArrow.clear();
      const targetX = this.GOAL_LEFT + this.GOAL_WIDTH * ((this.aimAngle + 1) / 2);

      // Dotted line from ball to goal
      const steps = 14;
      for (let s = 0; s < steps; s++) {
        if (s % 2 === 0) {
          const t0 = s / steps;
          const t1 = (s + 0.7) / steps;
          const x0 = this.ballX + (targetX - this.ballX) * t0;
          const y0 = this.ballY + (this.GOAL_Y + 25 - this.ballY) * t0;
          const x1 = this.ballX + (targetX - this.ballX) * t1;
          const y1 = this.ballY + (this.GOAL_Y + 25 - this.ballY) * t1;
          this.aimArrow.lineStyle(3, 0xffd700, 0.85);
          this.aimArrow.lineBetween(x0, y0, x1, y1);
        }
      }

      // Arrow head at goal
      this.aimArrow.fillStyle(0xffd700, 1);
      this.aimArrow.fillTriangle(
        targetX, this.GOAL_Y + 5,
        targetX - 10, this.GOAL_Y + 25,
        targetX + 10, this.GOAL_Y + 25
      );

      // Pulsing circle at target
      const pulse = 0.6 + 0.4 * Math.sin((_time ?? 0) / 120);
      this.aimArrow.lineStyle(3, 0xff8800, pulse);
      this.aimArrow.strokeCircle(targetX, this.GOAL_Y + 25, 14);

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.confirmAim();
      }
    }

    // Step: power — big visible horizontal bar
    if (this.stepState === 'power') {
      this.powerLevel += this.powerDir * 1.5 * dt;
      if (this.powerLevel > 1) { this.powerLevel = 1; this.powerDir = -1; }
      if (this.powerLevel < 0) { this.powerLevel = 0; this.powerDir = 1; }

      this.powerBarGfx.clear();

      const barX = 20;
      const barY = GAME_HEIGHT - 175;
      const barW = GAME_WIDTH - 40;
      const barH = 28;

      // Background
      this.powerBarGfx.fillStyle(0x111111, 0.85);
      this.powerBarGfx.fillRoundedRect(barX - 4, barY - 4, barW + 8, barH + 8, 6);

      // Bar fill — green -> yellow -> red
      const pColor = this.powerLevel > 0.7 ? 0xe74c3c : this.powerLevel > 0.4 ? 0xf39c12 : 0x2ecc71;
      this.powerBarGfx.fillStyle(pColor, 1);
      this.powerBarGfx.fillRect(barX, barY, barW * this.powerLevel, barH);

      // Tick marks
      this.powerBarGfx.lineStyle(2, 0xffffff, 0.4);
      for (let t = 0.25; t < 1; t += 0.25) {
        this.powerBarGfx.lineBetween(barX + barW * t, barY, barX + barW * t, barY + barH);
      }

      // Border
      this.powerBarGfx.lineStyle(2, 0xffffff, 0.8);
      this.powerBarGfx.strokeRoundedRect(barX - 4, barY - 4, barW + 8, barH + 8, 6);

      // POWER label
      this.powerBarGfx.fillStyle(0xffffff, 1);

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.confirmPower();
      }
    }

    // Step: kick (ball flying)
    if (this.stepState === 'kick' && this.ballActive) {
      // Update trail
      this.ballTrail.push({ x: this.ballX, y: this.ballY, alpha: 0.7 });
      if (this.ballTrail.length > 8) this.ballTrail.shift();
      for (const t of this.ballTrail) t.alpha *= 0.82;

      this.ballX += this.ballVX * dt;
      this.ballY += this.ballVY * dt;
      this.checkGoal();
    }

    // Draw ball trail
    this.ballGfx.clear();
    for (const t of this.ballTrail) {
      this.ballGfx.fillStyle(0xffffff, t.alpha * 0.4);
      this.ballGfx.fillCircle(t.x, t.y, 7);
    }

    // Draw ball shadow
    this.ballGfx.fillStyle(0x000000, 0.2);
    this.ballGfx.fillEllipse(this.ballX, this.ballY + 14, 20, 6);

    // Draw ball
    this.ballGfx.fillStyle(0xffffff, 1);
    this.ballGfx.fillCircle(this.ballX, this.ballY, 12);
    // Hex patch detail
    this.ballGfx.fillStyle(0x222222, 1);
    this.ballGfx.fillCircle(this.ballX, this.ballY, 4);
    this.ballGfx.fillStyle(0x444444, 0.6);
    this.ballGfx.fillCircle(this.ballX + 5, this.ballY - 5, 3);
    this.ballGfx.fillCircle(this.ballX - 5, this.ballY + 4, 3);
  }
}
