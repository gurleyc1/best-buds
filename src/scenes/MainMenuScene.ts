import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';
import { MusicManager } from '../systems/MusicManager';

export class MainMenuScene extends Phaser.Scene {
  private dadPreview: Phaser.GameObjects.Container | null = null;
  private lillianPreview: Phaser.GameObjects.Container | null = null;

  constructor() { super({ key: SCENE_KEYS.MAIN_MENU }); }

  create(): void {
    SceneTransition.fadeIn(this, 400);
    this.createBackground();
    this.createTitle();
    this.createCharacterPreviews();
    this.createButtons();
    this.createVersionText();

    // Start audio on first interaction (browser requires user gesture)
    this.input.once('pointerdown', () => {
      MusicManager.init();
      MusicManager.playTheme('hub');
    });
    this.input.keyboard?.once('keydown', () => {
      MusicManager.init();
      MusicManager.playTheme('hub');
    });
  }

  private createBackground(): void {
    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.BG_DARK, COLORS.BG_DARK, COLORS.BG_MID, COLORS.BG_MID, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Scattered stars
    const starGfx = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, GAME_WIDTH);
      const sy = Phaser.Math.Between(0, GAME_HEIGHT * 0.7);
      const sr = Math.random() < 0.2 ? 2 : 1;
      const alpha = 0.4 + Math.random() * 0.6;
      starGfx.fillStyle(0xffffff, alpha);
      starGfx.fillCircle(sx, sy, sr);
    }

    // Ground decoration
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x2d5a27, 1);
    groundGfx.fillRect(0, GAME_HEIGHT * 0.78, GAME_WIDTH, GAME_HEIGHT * 0.22);
    groundGfx.fillStyle(0x4caf50, 1);
    groundGfx.fillRect(0, GAME_HEIGHT * 0.78, GAME_WIDTH, 8);
  }

  private createTitle(): void {
    const titleText = this.add.text(GAME_WIDTH / 2, 120, 'Best Buds', {
      fontSize: '56px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#1a1a2e',
      strokeThickness: 8,
      shadow: { color: '#f39c12', blur: 10, fill: true },
    }).setOrigin(0.5);

    // Bobbing tween
    this.tweens.add({
      targets: titleText,
      y: 128,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 186, '\u266a Adventures Together \u266a', {
      fontSize: '18px',
      color: '#ff69b4',
      fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  private createCharacterPreviews(): void {
    const state = SaveManager.load();

    // Platform area behind characters
    const platformGfx = this.add.graphics();
    platformGfx.fillStyle(0x34495e, 0.6);
    platformGfx.fillRoundedRect(GAME_WIDTH / 2 - 130, 530, 260, 8, 4);

    // Dad preview
    this.dadPreview = CharacterRenderer.create(
      this, GAME_WIDTH / 2 - 60, 530, state.dadConfig, 2.5
    );

    // Lillian preview
    this.lillianPreview = CharacterRenderer.create(
      this, GAME_WIDTH / 2 + 60, 530, state.lillianConfig, 2.5
    );

    // Character name labels
    this.add.text(GAME_WIDTH / 2 - 60, 555, state.dadConfig.name, {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 60, 555, state.lillianConfig.name, {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Bob animations
    if (this.dadPreview) {
      this.tweens.add({
        targets: this.dadPreview,
        y: 525,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (this.lillianPreview) {
      this.tweens.add({
        targets: this.lillianPreview,
        y: 527,
        duration: 1900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 300,
      });
    }
  }

  private createButtons(): void {
    const btnY = 660;
    const btnW = 200;
    const btnH = 52;

    // PLAY button
    this.createButton(GAME_WIDTH / 2, btnY, btnW, btnH, 'PLAY', 0x2ecc71, 0x27ae60, () => {
      MusicManager.sfx('select');
      SceneTransition.switchScene(this, SCENE_KEYS.HUB);
    });

    // CUSTOMIZE button
    this.createButton(GAME_WIDTH / 2, btnY + 70, btnW, btnH, 'CUSTOMIZE', 0x9b59b6, 0x8e44ad, () => {
      MusicManager.sfx('select');
      SceneTransition.switchScene(this, SCENE_KEYS.CUSTOMIZE);
    });
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, color: number, hoverColor: number,
    callback: () => void
  ): void {
    const bg = this.add.graphics();
    const drawBtn = (c: number) => {
      bg.clear();
      bg.fillStyle(c);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      bg.lineStyle(2, 0xffffff, 0.3);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    };
    drawBtn(color);

    const txt = this.add.text(x, y, label, {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBtn(hoverColor));
    zone.on('pointerout', () => drawBtn(color));
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: txt, scaleX: 0.9, scaleY: 0.9, duration: 80, yoyo: true });
      callback();
    });

    void txt;
  }

  private createVersionText(): void {
    this.add.text(GAME_WIDTH - 8, GAME_HEIGHT - 8, 'v0.1', {
      fontSize: '11px', color: '#555555',
    }).setOrigin(1, 1);
  }
}
