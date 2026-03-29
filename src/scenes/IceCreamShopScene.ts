import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';
import { MusicManager } from '../systems/MusicManager';

interface Flavor {
  name: string;
  color: number;
  label: string;
  special?: 'mintchip' | 'rainbow';
}

const FLAVORS: Flavor[] = [
  { name: 'strawberry', label: 'Strawberry', color: 0xff69b4 },
  { name: 'chocolate',  label: 'Chocolate',  color: 0x5d4037 },
  { name: 'vanilla',    label: 'Vanilla',    color: 0xfff8dc },
  { name: 'mintchip',   label: 'Mint Chip',  color: 0x98fb98, special: 'mintchip' },
  { name: 'lemon',      label: 'Lemon',      color: 0xffd700 },
  { name: 'blueberry',  label: 'Blueberry',  color: 0x6a5acd },
  { name: 'watermelon', label: 'Watermelon', color: 0xff4444 },
  { name: 'rainbow',    label: 'Rainbow',    color: 0xff69b4, special: 'rainbow' },
];

export class IceCreamShopScene extends Phaser.Scene {
  protected sceneData: { returnX?: number; returnY?: number } = {};

  private dadContainer!: Phaser.GameObjects.Container;
  private lillianContainer!: Phaser.GameObjects.Container;
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private flavorButtons: Phaser.GameObjects.Container[] = [];
  private coneGraphic: Phaser.GameObjects.Container | null = null;
  private actionButtons: Phaser.GameObjects.Container | null = null;
  private phase: 'enter' | 'choose' | 'eating' = 'enter';

  constructor() {
    super({ key: 'IceCreamShopScene' });
  }

  create(data?: { returnX?: number; returnY?: number }): void {
    this.sceneData = data ?? {};
    this.phase = 'enter';
    this.flavorButtons = [];
    this.speechBubble = null;
    this.coneGraphic = null;
    this.actionButtons = null;

    SceneTransition.fadeIn(this, 300);
    MusicManager.resume();
    MusicManager.playTheme('hub');

    this.drawShopInterior();
    this.createCharacters();
    this.runEnterSequence();
    this.createUI();
  }

  // ─── Shop Interior ────────────────────────────────────────────────────────────

  private drawShopInterior(): void {
    const g = this.add.graphics();

    // Walls — pastel cream
    g.fillStyle(0xfff9f0);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Floor — light pink/tan
    g.fillStyle(0xffe0f0);
    g.fillRect(0, GAME_HEIGHT * 0.65, GAME_WIDTH, GAME_HEIGHT * 0.35);

    // Floor tiles
    g.lineStyle(1, 0xffb3d9, 0.5);
    for (let tx = 0; tx < GAME_WIDTH; tx += 48) {
      g.lineBetween(tx, GAME_HEIGHT * 0.65, tx, GAME_HEIGHT);
    }
    for (let ty = GAME_HEIGHT * 0.65; ty < GAME_HEIGHT; ty += 48) {
      g.lineBetween(0, ty, GAME_WIDTH, ty);
    }

    // Back wall
    g.fillStyle(0xffe4f0);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.65);

    // Wall decorations — sprinkle dots
    const sprinkleColors = [0xff69b4, 0xffd700, 0x3498db, 0x2ecc71, 0xe74c3c];
    for (let i = 0; i < 40; i++) {
      const sx = (i * 47 + 30) % GAME_WIDTH;
      const sy = (i * 61 + 20) % (GAME_HEIGHT * 0.55);
      g.fillStyle(sprinkleColors[i % sprinkleColors.length], 0.5);
      g.fillRect(sx, sy, 8, 3);
    }

    // Stars
    for (let i = 0; i < 12; i++) {
      const sx = (i * 79 + 40) % GAME_WIDTH;
      const sy = (i * 53 + 30) % (GAME_HEIGHT * 0.5);
      g.fillStyle(0xffd700, 0.6);
      this.drawStar(g, sx, sy, 6);
    }

    // Counter — pink
    const counterY = GAME_HEIGHT * 0.62;
    g.fillStyle(0xff80c0);
    g.fillRect(0, counterY, GAME_WIDTH, 14);
    g.fillStyle(0xff69b4);
    g.fillRect(0, counterY + 14, GAME_WIDTH, GAME_HEIGHT * 0.12);

    // Display case on counter
    g.fillStyle(0xffffff, 0.7);
    g.fillRoundedRect(80, counterY - 60, GAME_WIDTH - 160, 60, 8);
    g.lineStyle(2, 0xff80c0, 1);
    g.strokeRoundedRect(80, counterY - 60, GAME_WIDTH - 160, 60, 8);

    // Small scoops in display case
    this.drawDisplayScoops(counterY - 60);

    // Main sign
    this.drawSign();

    // Menu board
    this.drawMenuBoard();

    // Shopkeeper
    this.drawShopkeeper(counterY);

    // Awning at top
    this.drawAwning();
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    const points: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    g.fillPoints(
      points.reduce((acc, v, i) => {
        if (i % 2 === 0) acc.push({ x: points[i], y: points[i + 1] });
        return acc;
      }, [] as { x: number; y: number }[]),
      true
    );
  }

  private drawDisplayScoops(topY: number): void {
    const g = this.add.graphics().setDepth(2);
    const startX = 110;
    const spacing = 38;
    FLAVORS.forEach((fl, i) => {
      const sx = startX + i * spacing;
      const sy = topY + 40;
      g.fillStyle(0xf4d9a0); // cone
      g.fillTriangle(sx - 8, sy, sx + 8, sy, sx, sy + 20);
      g.fillStyle(fl.color);
      g.fillCircle(sx, sy - 4, 12);
    });
  }

  private drawSign(): void {
    const g = this.add.graphics().setDepth(3);

    // Sign background
    g.fillStyle(0xff69b4);
    g.fillRoundedRect(GAME_WIDTH / 2 - 160, 18, 320, 48, 12);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(GAME_WIDTH / 2 - 160, 18, 320, 48, 12);

    // Ice cream icon on sign
    g.fillStyle(0xfff8dc);
    g.fillCircle(GAME_WIDTH / 2 - 130, 42, 14);
    g.fillStyle(0xf4d9a0);
    g.fillTriangle(
      GAME_WIDTH / 2 - 138, 42,
      GAME_WIDTH / 2 - 122, 42,
      GAME_WIDTH / 2 - 130, 62
    );

    this.add.text(GAME_WIDTH / 2 + 10, 42, 'BEST BUDS ICE CREAM', {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#cc3388',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);
  }

  private drawMenuBoard(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x2c1810);
    g.fillRoundedRect(GAME_WIDTH - 130, 80, 110, 150, 6);
    g.fillStyle(0x3d1f15);
    g.fillRoundedRect(GAME_WIDTH - 126, 84, 102, 142, 4);

    this.add.text(GAME_WIDTH - 75, 90, 'MENU', {
      fontSize: '11px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    const menuItems = ['Cone  $2', 'Cup   $2', 'Float $3', 'Shake $4'];
    menuItems.forEach((item, i) => {
      this.add.text(GAME_WIDTH - 125 + 4, 106 + i * 22, item, {
        fontSize: '10px', color: '#ffffff',
      }).setDepth(3);
    });
  }

  private drawShopkeeper(counterY: number): void {
    const g = this.add.graphics().setDepth(5);
    const kx = GAME_WIDTH / 2;
    const ky = counterY - 20;

    // Body
    g.fillStyle(0xff80c0);
    g.fillRect(kx - 14, ky - 40, 28, 35);
    // Head
    g.fillStyle(0xfde0c8);
    g.fillCircle(kx, ky - 50, 14);
    // Hair (dark)
    g.fillStyle(0x5d4037);
    g.beginPath();
    g.arc(kx, ky - 50, 14, Math.PI, 0, false);
    g.closePath();
    g.fillPath();
    // Hat
    g.fillStyle(0xff69b4);
    g.fillRect(kx - 14, ky - 68, 28, 8);
    g.fillRect(kx - 8, ky - 80, 16, 14);
    // Eyes
    g.fillStyle(0x1a1a2e);
    g.fillCircle(kx - 5, ky - 52, 2);
    g.fillCircle(kx + 5, ky - 52, 2);
    // Smile
    g.lineStyle(2, 0xff6090, 1);
    g.beginPath();
    g.arc(kx, ky - 46, 5, 0, Math.PI, false);
    g.strokePath();
    // Ice cream in hand
    g.fillStyle(0xf4d9a0);
    g.fillTriangle(kx + 18, ky - 20, kx + 26, ky - 20, kx + 22, ky);
    g.fillStyle(0xff69b4);
    g.fillCircle(kx + 22, ky - 24, 8);
  }

  private drawAwning(): void {
    const g = this.add.graphics().setDepth(1);
    const stripeCount = 12;
    const stripeW = GAME_WIDTH / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      g.fillStyle(i % 2 === 0 ? 0xff69b4 : 0xffffff, 0.9);
      g.fillRect(i * stripeW, 0, stripeW, 16);
    }
    // Scalloped bottom
    g.fillStyle(0xff80c0, 0.8);
    for (let i = 0; i < stripeCount; i++) {
      g.fillCircle(i * stripeW + stripeW / 2, 16, stripeW / 2);
    }
  }

  // ─── Characters ──────────────────────────────────────────────────────────────

  private createCharacters(): void {
    const state = SaveManager.load();
    // Start off-screen left, will walk in
    this.dadContainer = CharacterRenderer.create(
      this, -60, GAME_HEIGHT * 0.75, state.dadConfig, 1.5
    );
    this.lillianContainer = CharacterRenderer.create(
      this, -110, GAME_HEIGHT * 0.77, state.lillianConfig, 1.5
    );
    this.dadContainer.setDepth(10);
    this.lillianContainer.setDepth(9);
  }

  // ─── Enter Sequence ───────────────────────────────────────────────────────────

  private runEnterSequence(): void {
    // Walk characters in from the left
    this.tweens.add({
      targets: [this.dadContainer, this.lillianContainer],
      x: (target: Phaser.GameObjects.Container) =>
        target === this.dadContainer ? GAME_WIDTH / 2 - 40 : GAME_WIDTH / 2 + 40,
      duration: 800, ease: 'Quad.Out',
      onComplete: () => {
        this.time.delayedCall(200, () => {
          this.showSpeech(this.dadContainer, 'What flavor do you want?', () => {
            this.showFlavorButtons();
          });
        });
      },
    });
  }

  // ─── Flavor Buttons ───────────────────────────────────────────────────────────

  private showFlavorButtons(): void {
    this.phase = 'choose';
    const cols = 4;
    const rows = 2;
    const startX = 60;
    const startY = GAME_HEIGHT * 0.3;
    const spacingX = (GAME_WIDTH - 80) / (cols - 1);
    const spacingY = 110;

    FLAVORS.forEach((flavor, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const fx = startX + col * spacingX;
      const fy = startY + row * spacingY;

      const btn = this.makeScoopButton(fx, fy, flavor);
      this.flavorButtons.push(btn);
    });
  }

  private makeScoopButton(x: number, y: number, flavor: Flavor): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(20);
    const RADIUS = 30;

    const g = this.add.graphics();
    this.drawScoop(g, 0, 0, RADIUS, flavor);
    container.add(g);

    // Label
    const label = this.add.text(0, RADIUS + 14, flavor.label, {
      fontSize: '11px', color: '#1a1a2e',
      stroke: '#ffffffcc', strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(label);

    // Hit area
    const hitCircle = this.add.circle(0, 0, RADIUS + 6, 0xffffff, 0)
      .setInteractive(new Phaser.Geom.Circle(0, 0, RADIUS + 6), Phaser.Geom.Circle.Contains);
    container.add(hitCircle);

    hitCircle.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.12, scaleY: 1.12, duration: 100 });
    });
    hitCircle.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });
    hitCircle.on('pointerdown', () => {
      if (this.phase === 'choose') this.selectFlavor(flavor, container);
    });

    return container;
  }

  private drawScoop(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    r: number, flavor: Flavor
  ): void {
    const CONE_COLOR = 0xd4a843;

    // Cone
    g.fillStyle(CONE_COLOR);
    g.fillTriangle(cx - r * 0.7, cy + 4, cx + r * 0.7, cy + 4, cx, cy + r * 1.5);
    // Cone pattern
    g.lineStyle(1, 0xb8902a, 0.7);
    for (let ci = 1; ci <= 3; ci++) {
      const coneY = cy + 4 + ci * (r * 1.5 - 4) / 4;
      const halfW = ((4 - ci) / 4) * r * 0.7;
      g.lineBetween(cx - halfW, coneY, cx + halfW, coneY);
    }

    if (flavor.special === 'rainbow') {
      // Multi-colored arcs inside scoop circle
      const rainbowColors = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6];
      rainbowColors.forEach((rc, ri) => {
        const innerR = r - ri * (r / rainbowColors.length);
        g.fillStyle(rc);
        g.fillCircle(cx, cy, innerR);
      });
      // White center
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(cx, cy, r * 0.2);
    } else {
      // Regular scoop
      g.fillStyle(flavor.color);
      g.fillCircle(cx, cy, r);
      // Highlight
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.3);
    }

    if (flavor.special === 'mintchip') {
      // Dark chocolate chips
      g.fillStyle(0x3e2723);
      const chips: [number, number][] = [
        [-8, -5], [5, -12], [-3, 8], [10, 5], [-12, 2],
      ];
      chips.forEach(([ox, oy]) => {
        g.fillEllipse(cx + ox, cy + oy, 6, 4);
      });
    }
  }

  // ─── Select Flavor ───────────────────────────────────────────────────────────

  private selectFlavor(flavor: Flavor, btn: Phaser.GameObjects.Container): void {
    this.phase = 'eating';
    MusicManager.sfx('celebrate');

    // Bounce the selected button
    this.tweens.add({
      targets: btn,
      scaleX: 1.3, scaleY: 1.3, yoyo: true, duration: 200, repeat: 1,
    });

    // Fade out other buttons
    this.flavorButtons.forEach(b => {
      if (b !== btn) {
        this.tweens.add({ targets: b, alpha: 0, duration: 300, onComplete: () => b.destroy() });
      }
    });

    // After a moment, show character holding cone
    this.time.delayedCall(400, () => {
      btn.destroy();
      this.flavorButtons = [];
      this.showCharacterWithCone(flavor);
    });
  }

  private showCharacterWithCone(flavor: Flavor): void {
    // Draw cone next to dad character
    if (this.coneGraphic) this.coneGraphic.destroy();
    const cx = this.dadContainer.x + 28;
    const cy = this.dadContainer.y - 20;
    const cg = this.add.graphics().setDepth(12);
    this.drawScoop(cg, 0, 0, 20, flavor);
    this.coneGraphic = this.add.container(cx, cy).setDepth(12);
    this.coneGraphic.add(cg);

    // Bounce cone in
    this.coneGraphic.setScale(0);
    this.tweens.add({ targets: this.coneGraphic, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.Out' });

    // Speech bubble
    const playerName = SaveManager.load().dadConfig.name;
    this.showSpeech(this.dadContainer, `${playerName} loves ${flavor.label}! Yummy! 🍦`, () => {
      this.time.delayedCall(300, () => this.showGoAgainButtons());
    });
  }

  // ─── Go Again / Home Buttons ─────────────────────────────────────────────────

  private showGoAgainButtons(): void {
    if (this.actionButtons) this.actionButtons.destroy();
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.88).setDepth(30);
    this.actionButtons = container;

    const makeBtnGraphic = (
      lbl: string, bx: number, bgColor: number, cb: () => void
    ): void => {
      const bg = this.add.graphics();
      bg.fillStyle(bgColor);
      bg.fillRoundedRect(bx - 70, -18, 140, 36, 10);
      const txt = this.add.text(bx, 0, lbl, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const zone = this.add.zone(bx, 0, 140, 36)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', cb);
      zone.on('pointerover', () => {
        this.tweens.add({ targets: [bg, txt], alpha: 0.8, duration: 80 });
      });
      zone.on('pointerout', () => {
        this.tweens.add({ targets: [bg, txt], alpha: 1, duration: 80 });
      });
      container.add([bg, txt, zone]);
    };

    makeBtnGraphic('Go again?', -80, 0xff69b4, () => {
      if (this.actionButtons) { this.actionButtons.destroy(); this.actionButtons = null; }
      if (this.coneGraphic) { this.coneGraphic.destroy(); this.coneGraphic = null; }
      if (this.speechBubble) { this.speechBubble.destroy(); this.speechBubble = null; }
      this.phase = 'choose';
      this.showFlavorButtons();
    });

    makeBtnGraphic('Head home', 80, 0x3498db, () => {
      MusicManager.sfx('select');
      SceneTransition.switchScene(this, SCENE_KEYS.HUB, {
        returnX: this.sceneData.returnX,
        returnY: this.sceneData.returnY,
      });
    });

    // Bounce in
    container.setScale(0);
    this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.Out' });
  }

  // ─── Speech Bubble ───────────────────────────────────────────────────────────

  private showSpeech(
    target: Phaser.GameObjects.Container, text: string,
    onDone?: () => void
  ): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }

    const bx = target.x;
    const by = target.y - 65;
    const bubble = this.add.container(bx, by).setDepth(50);
    this.speechBubble = bubble;

    const label = this.add.text(0, 0, text, {
      fontSize: '14px', color: '#1a1a2e', wordWrap: { width: 200 },
    }).setOrigin(0.5);

    const tw = label.width + 20;
    const th = label.height + 12;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 8);
    bg.fillTriangle(-6, th / 2, 6, th / 2, 0, th / 2 + 8);
    bubble.add([bg, label]);

    // Scale in
    bubble.setScale(0);
    this.tweens.add({ targets: bubble, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });

    const displayTime = text.length * 60 + 1000;
    this.time.delayedCall(displayTime, () => {
      if (this.speechBubble === bubble) {
        this.tweens.add({
          targets: bubble, alpha: 0, duration: 200,
          onComplete: () => {
            bubble.destroy();
            if (this.speechBubble === bubble) this.speechBubble = null;
            if (onDone) onDone();
          },
        });
      } else {
        if (onDone) onDone();
      }
    });
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  private createUI(): void {
    const homeBtn = this.add.text(GAME_WIDTH / 2, 28, '⌂ Home', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#2c3e50cc',
      padding: { x: 14, y: 7 },
    })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });

    homeBtn.on('pointerdown', () => {
      MusicManager.sfx('select');
      SceneTransition.switchScene(this, SCENE_KEYS.HUB, {
        returnX: this.sceneData.returnX,
        returnY: this.sceneData.returnY,
      });
    });
    homeBtn.on('pointerover', () => homeBtn.setBackgroundColor('#3498db'));
    homeBtn.on('pointerout', () => homeBtn.setBackgroundColor('#2c3e50cc'));
  }
}
