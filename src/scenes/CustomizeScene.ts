import Phaser from 'phaser';
import {
  SCENE_KEYS, COLORS, GAME_WIDTH, GAME_HEIGHT,
  HAIR_STYLES, HAIR_COLORS, SKIN_TONES, CLOTHING_COLORS, ACCESSORIES
} from '../config';
import { CharacterConfig } from '../types';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';

export class CustomizeScene extends Phaser.Scene {
  private dadConfig!: CharacterConfig;
  private lillianConfig!: CharacterConfig;
  private activeTab: 'dad' | 'lillian' = 'dad';
  private previewContainer: Phaser.GameObjects.Container | null = null;
  private optionObjects: Phaser.GameObjects.GameObject[] = [];
  private scrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private tabDad!: Phaser.GameObjects.Graphics;
  private tabLillian!: Phaser.GameObjects.Graphics;
  private tabDadText!: Phaser.GameObjects.Text;
  private tabLillianText!: Phaser.GameObjects.Text;

  constructor() { super({ key: SCENE_KEYS.CUSTOMIZE }); }

  create(): void {
    SceneTransition.fadeIn(this, 300);
    const state = SaveManager.load();
    this.dadConfig = { ...state.dadConfig };
    this.lillianConfig = { ...state.lillianConfig };
    this.scrollY = 0;

    this.createBackground();
    this.createHeader();
    this.createTabs();
    this.createPreviewArea();
    this.createOptionsArea();
    this.createSaveButton();
    this.refreshPreview();
    this.buildOptions();
  }

  private get currentConfig(): CharacterConfig {
    return this.activeTab === 'dad' ? this.dadConfig : this.lillianConfig;
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private createHeader(): void {
    this.add.text(GAME_WIDTH / 2, 22, 'CUSTOMIZE', {
      fontSize: '26px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back arrow
    const backBtn = this.add.text(20, 22, '\u2190', {
      fontSize: '28px', color: '#ecf0f1',
      backgroundColor: '#2c3e50', padding: { x: 10, y: 2 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => SceneTransition.switchScene(this, SCENE_KEYS.MAIN_MENU));
  }

  private createTabs(): void {
    const tabW = 100;
    const tabH = 34;
    const tabY = 50;

    this.tabDad = this.add.graphics();
    this.tabLillian = this.add.graphics();
    this.tabDadText = this.add.text(GAME_WIDTH / 2 - tabW - 4, tabY + tabH / 2, 'Dad', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tabLillianText = this.add.text(GAME_WIDTH / 2 + 4, tabY + tabH / 2, 'Lillian', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.updateTabs();

    const dadZone = this.add.zone(GAME_WIDTH / 2 - tabW - 4, tabY + tabH / 2, tabW + 16, tabH)
      .setInteractive({ useHandCursor: true });
    dadZone.on('pointerdown', () => { this.activeTab = 'dad'; this.scrollY = 0; this.updateTabs(); this.refreshPreview(); this.buildOptions(); });

    const lillianZone = this.add.zone(GAME_WIDTH / 2 + tabW / 2 + 4, tabY + tabH / 2, tabW + 16, tabH)
      .setInteractive({ useHandCursor: true });
    lillianZone.on('pointerdown', () => { this.activeTab = 'lillian'; this.scrollY = 0; this.updateTabs(); this.refreshPreview(); this.buildOptions(); });
  }

  private updateTabs(): void {
    const tabW = 100;
    const tabH = 34;
    const tabY = 50;

    this.tabDad.clear();
    this.tabDad.fillStyle(this.activeTab === 'dad' ? COLORS.BLUE : COLORS.DARK_GRAY);
    this.tabDad.fillRoundedRect(GAME_WIDTH / 2 - tabW * 2 - 4, tabY, tabW * 1.5, tabH, 6);

    this.tabLillian.clear();
    this.tabLillian.fillStyle(this.activeTab === 'lillian' ? COLORS.PINK : COLORS.DARK_GRAY);
    this.tabLillian.fillRoundedRect(GAME_WIDTH / 2, tabY, tabW * 1.5, tabH, 6);

    this.tabDadText.setColor(this.activeTab === 'dad' ? '#ffffff' : '#aaaaaa');
    this.tabLillianText.setColor(this.activeTab === 'lillian' ? '#ffffff' : '#aaaaaa');
    this.tabLillianText.setX(GAME_WIDTH / 2 + tabW * 0.75);
    this.tabDadText.setX(GAME_WIDTH / 2 - tabW * 1.25 - 4);
  }

  private createPreviewArea(): void {
    const previewBg = this.add.graphics();
    previewBg.fillStyle(0x16213e);
    previewBg.fillRoundedRect(10, 90, 160, 200, 8);
    this.add.text(90, 100, 'PREVIEW', { fontSize: '11px', color: '#888888' }).setOrigin(0.5);
  }

  private refreshPreview(): void {
    if (this.previewContainer) {
      this.previewContainer.destroy();
      this.previewContainer = null;
    }
    this.previewContainer = CharacterRenderer.create(
      this, 90, 250, this.currentConfig, 3
    );
  }

  private createOptionsArea(): void {
    // Scrollable area background
    const areaBg = this.add.graphics();
    areaBg.fillStyle(0x16213e, 0.8);
    areaBg.fillRoundedRect(178, 90, GAME_WIDTH - 188, GAME_HEIGHT - 170, 8);

    // Scroll mask
    const maskShape = this.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(178, 90, GAME_WIDTH - 188, GAME_HEIGHT - 170);
    const mask = maskShape.createGeometryMask();

    this.contentContainer = this.add.container(178, 90);
    this.contentContainer.setMask(mask);

    // Scroll input
    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, 1200);
      this.contentContainer.setY(90 - this.scrollY);
    });
  }

  private buildOptions(): void {
    // Clear old options
    this.optionObjects.forEach(o => o.destroy());
    this.optionObjects = [];
    this.contentContainer.removeAll(false);
    this.scrollY = 0;
    this.contentContainer.setY(90);

    const cfg = this.currentConfig;
    let yOff = 10;
    const panelW = GAME_WIDTH - 192;

    yOff = this.buildHairStyleSection(yOff, panelW, cfg);
    yOff = this.buildSwatchSection(yOff, panelW, 'HAIR COLOR', HAIR_COLORS, 'hairColor', cfg);
    yOff = this.buildSwatchSection(yOff, panelW, 'SKIN TONE', SKIN_TONES, 'skinTone', cfg);
    yOff = this.buildSwatchSection(yOff, panelW, 'SHIRT COLOR', CLOTHING_COLORS, 'topColor', cfg);
    yOff = this.buildSwatchSection(yOff, panelW, 'PANTS COLOR', CLOTHING_COLORS, 'bottomColor', cfg);
    yOff = this.buildSwatchSection(yOff, panelW, 'SHOES COLOR', CLOTHING_COLORS, 'shoeColor', cfg);
    yOff = this.buildAccessorySection(yOff, panelW, cfg);

    void yOff;
  }

  private buildSectionHeader(yOff: number, label: string): number {
    const txt = this.add.text(8, yOff, label, {
      fontSize: '12px', color: '#ffd700', fontStyle: 'bold',
    });
    this.contentContainer.add(txt);
    this.optionObjects.push(txt);
    return yOff + 20;
  }

  private buildHairStyleSection(yOff: number, _panelW: number, cfg: CharacterConfig): number {
    yOff = this.buildSectionHeader(yOff, 'HAIR STYLE');
    const cols = 3;
    const btnW = 85;
    const btnH = 24;
    const gap = 4;

    HAIR_STYLES.forEach((style, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = col * (btnW + gap) + 4;
      const by = yOff + row * (btnH + gap);

      const isSelected = cfg.hairStyle === style;
      const bg = this.add.graphics();
      bg.fillStyle(isSelected ? COLORS.BLUE : 0x2c3e50);
      bg.fillRoundedRect(bx, by, btnW, btnH, 4);
      if (isSelected) {
        bg.lineStyle(2, 0xffd700, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 4);
      }

      const label = style.replace(/_/g, ' ');
      const txt = this.add.text(bx + btnW / 2, by + btnH / 2, label, {
        fontSize: '10px', color: isSelected ? '#ffffff' : '#aaaaaa',
      }).setOrigin(0.5);

      const zone = this.add.zone(bx + btnW / 2, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.currentConfig.hairStyle = style;
        this.refreshPreview();
        this.buildOptions();
      });

      this.contentContainer.add([bg, txt, zone]);
      this.optionObjects.push(bg, txt, zone);
    });

    const rows = Math.ceil(HAIR_STYLES.length / cols);
    return yOff + rows * (btnH + gap) + 10;
  }

  private buildSwatchSection(
    yOff: number,
    _panelW: number,
    label: string,
    swatches: { name: string; value: number }[],
    key: keyof CharacterConfig,
    cfg: CharacterConfig
  ): number {
    yOff = this.buildSectionHeader(yOff, label);
    const sz = 26;
    const gap = 4;
    const cols = 8;

    swatches.forEach((sw, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = col * (sz + gap) + 4;
      const sy = yOff + row * (sz + gap);

      const isSelected = (cfg[key] as number) === sw.value;
      const bg = this.add.graphics();
      bg.fillStyle(sw.value);
      bg.fillCircle(sx + sz / 2, sy + sz / 2, sz / 2);
      if (isSelected) {
        bg.lineStyle(2, 0xffd700, 1);
        bg.strokeCircle(sx + sz / 2, sy + sz / 2, sz / 2 + 2);
      }

      const zone = this.add.zone(sx + sz / 2, sy + sz / 2, sz, sz).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        (this.currentConfig as unknown as Record<string, unknown>)[key] = sw.value;
        this.refreshPreview();
        this.buildOptions();
      });

      this.contentContainer.add([bg, zone]);
      this.optionObjects.push(bg, zone);
    });

    const rows = Math.ceil(swatches.length / cols);
    return yOff + rows * (sz + gap) + 10;
  }

  private buildAccessorySection(yOff: number, _panelW: number, cfg: CharacterConfig): number {
    yOff = this.buildSectionHeader(yOff, 'ACCESSORY');
    const accessories = this.activeTab === 'dad' ? ACCESSORIES.dad : ACCESSORIES.lillian;
    const btnH = 26;
    const btnW = 86;
    const gap = 4;
    const cols = 3;

    accessories.forEach((acc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = col * (btnW + gap) + 4;
      const by = yOff + row * (btnH + gap);

      const isSelected = cfg.accessory === acc;
      const bg = this.add.graphics();
      bg.fillStyle(isSelected ? COLORS.PURPLE : 0x2c3e50);
      bg.fillRoundedRect(bx, by, btnW, btnH, 4);
      if (isSelected) {
        bg.lineStyle(2, 0xffd700, 1);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 4);
      }

      const label = acc.replace(/_/g, ' ');
      const txt = this.add.text(bx + btnW / 2, by + btnH / 2, label, {
        fontSize: '10px', color: isSelected ? '#ffffff' : '#aaaaaa',
      }).setOrigin(0.5);

      const zone = this.add.zone(bx + btnW / 2, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.currentConfig.accessory = acc;
        this.refreshPreview();
        this.buildOptions();
      });

      this.contentContainer.add([bg, txt, zone]);
      this.optionObjects.push(bg, txt, zone);
    });

    const rows = Math.ceil(accessories.length / cols);
    return yOff + rows * (btnH + gap) + 10;
  }

  private createSaveButton(): void {
    const bg = this.add.graphics();
    const btnW = 160;
    const btnH = 44;
    const bx = GAME_WIDTH / 2 - btnW / 2;
    const by = GAME_HEIGHT - 70;

    bg.fillStyle(COLORS.GREEN);
    bg.fillRoundedRect(bx, by, btnW, btnH, 10);

    const txt = this.add.text(GAME_WIDTH / 2, by + btnH / 2, 'SAVE & BACK', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(GAME_WIDTH / 2, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { bg.clear(); bg.fillStyle(0x27ae60); bg.fillRoundedRect(bx, by, btnW, btnH, 10); });
    zone.on('pointerout', () => { bg.clear(); bg.fillStyle(COLORS.GREEN); bg.fillRoundedRect(bx, by, btnW, btnH, 10); });
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: txt, scaleX: 0.9, scaleY: 0.9, duration: 80, yoyo: true });
      const state = SaveManager.load();
      state.dadConfig = this.dadConfig;
      state.lillianConfig = this.lillianConfig;
      SaveManager.save(state);
      SceneTransition.switchScene(this, SCENE_KEYS.MAIN_MENU);
    });
  }
}
