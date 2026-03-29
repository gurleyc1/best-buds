import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { SaveManager } from '../../systems/SaveManager';
import { SceneTransition } from '../../systems/SceneTransition';
import { MusicManager } from '../../systems/MusicManager';

export abstract class BaseMiniGameScene extends Phaser.Scene {
  protected score1 = 0;
  protected score2 = 0;
  protected isPaused = false;
  protected gameActive = false;
  protected scoreText1!: Phaser.GameObjects.Text;
  protected scoreText2!: Phaser.GameObjects.Text;
  protected abstract gameName: string;

  protected sceneData: { returnX?: number; returnY?: number; transportMode?: string } = {};
  private keyEsc!: Phaser.Input.Keyboard.Key;

  protected captureReturnData(data?: { returnX?: number; returnY?: number; transportMode?: string }): void {
    this.sceneData = data ?? {};
  }

  protected setupEscapeKey(): void {
    if (this.input.keyboard) {
      this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }
  }

  protected checkEscape(): void {
    if (this.keyEsc && Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.exitToHub();
    }
  }

  protected createHUD(label1: string, label2 = ''): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(COLORS.BG_DARK, 0.8);
    hudBg.fillRect(0, 0, GAME_WIDTH, 50);
    hudBg.setDepth(100);

    this.add.text(12, 8, label1, { fontSize: '11px', color: '#aaaaaa' }).setDepth(101);
    this.scoreText1 = this.add.text(12, 22, '0', { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }).setDepth(101);

    if (label2) {
      this.add.text(GAME_WIDTH - 12, 8, label2, { fontSize: '11px', color: '#aaaaaa' }).setOrigin(1, 0).setDepth(101);
      this.scoreText2 = this.add.text(GAME_WIDTH - 12, 22, '0', { fontSize: '20px', color: '#ff69b4', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(101);
    }

    const backBtn = this.add.text(GAME_WIDTH / 2, 25, '\u2302', {
      fontSize: '22px', color: '#ecf0f1',
      backgroundColor: '#2c3e50', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.exitToHub());
  }

  protected addScore(player: 1 | 2, amount = 1): void {
    if (player === 1) {
      this.score1 += amount;
      if (this.scoreText1) this.scoreText1.setText(String(this.score1));
    } else {
      this.score2 += amount;
      if (this.scoreText2) this.scoreText2.setText(String(this.score2));
    }
    this.checkMilestone(player === 1 ? this.score1 : this.score2);
  }

  private checkMilestone(score: number): void {
    if (score > 0 && score % 5 === 0) {
      this.showCelebration(score % 25 === 0 ? '\uD83C\uDF1F AMAZING! \uD83C\uDF1F' : score % 10 === 0 ? '\u2B50 AWESOME! \u2B50' : 'Nice! +' + score);
    }
  }

  protected showCelebration(message: string): void {
    MusicManager.sfx('celebrate');
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, message, {
      fontSize: '32px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt, scaleX: 1.4, scaleY: 1.4, alpha: 0,
      duration: 1500, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  protected async exitToHub(): Promise<void> {
    MusicManager.stopMusic();
    SaveManager.updateScore(this.gameName, Math.max(this.score1, this.score2));
    await SceneTransition.fadeOut(this, 300);
    this.scene.start(SCENE_KEYS.HUB, this.sceneData);
  }
}
