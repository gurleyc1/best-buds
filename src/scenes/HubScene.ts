import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, GAME_WIDTH, GAME_HEIGHT, WORLD_SIZE, WALK_SPEED, BIKE_SPEED, CAR_SPEED } from '../config';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';
import { TransportMode } from '../types';

interface LocationData {
  x: number;
  y: number;
  label: string;
  dialogue: string;
  scene?: string;
  triggerW: number;
  triggerH: number;
}

export class HubScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container;
  private companionContainer!: Phaser.GameObjects.Container;
  private carSprite!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private playerX = 320;
  private playerY = 350;
  private playerFacingRight = true;
  private transportMode: TransportMode = 'walk';
  private transportBtns: { walk: Phaser.GameObjects.Text; bike: Phaser.GameObjects.Text; car: Phaser.GameObjects.Text } | null = null;
  private dialogueBubble: Phaser.GameObjects.Container | null = null;
  private transitioning = false;
  private touchTarget: { x: number; y: number } | null = null;
  private triggerZones: Array<{ zone: Phaser.Geom.Rectangle; data: LocationData; triggered: boolean }> = [];

  private readonly LOCATIONS: LocationData[] = [
    { x: 320, y: 300, label: 'Home', dialogue: "Let's build a marble run!", scene: SCENE_KEYS.MARBLE_RUN, triggerW: 72, triggerH: 64 },
    { x: 900, y: 250, label: 'Tennis Court', dialogue: 'Tennis time!', scene: SCENE_KEYS.TENNIS, triggerW: 100, triggerH: 80 },
    { x: 900, y: 750, label: 'Soccer Field', dialogue: 'Penalty kicks!', scene: SCENE_KEYS.SOCCER, triggerW: 100, triggerH: 80 },
    { x: 350, y: 750, label: 'Playground', dialogue: 'Keepy uppy!', scene: SCENE_KEYS.KEEPY_UPPY, triggerW: 80, triggerH: 80 },
    { x: 640, y: 500, label: 'Park', dialogue: "Let's explore!", scene: undefined, triggerW: 120, triggerH: 100 },
  ];

  constructor() { super({ key: SCENE_KEYS.HUB }); }

  create(): void {
    SceneTransition.fadeIn(this, 400);
    this.transitioning = false;
    this.triggerZones = [];

    this.buildWorld();
    this.setupPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupTransportUI();

    this.triggerZones.forEach(tz => { tz.triggered = false; });
  }

  private buildWorld(): void {
    // Grass background — tile the Kenney grass tile (16x16 scaled 2x = 32px)
    const useKenneyGrass = this.textures.exists('kenney_grass');
    if (useKenneyGrass) {
      // TileSprite covers the entire world with the 16px Kenney grass tile
      this.add.tileSprite(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 'kenney_grass')
        .setTileScale(2, 2);
    } else {
      const grassGfx = this.add.graphics();
      grassGfx.fillStyle(COLORS.GRASS);
      grassGfx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    }

    // Roads — draw base road colour then overlay Kenney road tile
    const roadGfx = this.add.graphics();
    roadGfx.fillStyle(COLORS.ROAD);
    // Horizontal road
    roadGfx.fillRect(0, 580, WORLD_SIZE, 60);
    // Vertical road
    roadGfx.fillRect(80, 0, 60, WORLD_SIZE);

    if (this.textures.exists('kenney_road')) {
      // Tile the Kenney road tile over road areas (2x scale = 32px)
      this.add.tileSprite(WORLD_SIZE / 2, 610, WORLD_SIZE, 60, 'kenney_road').setTileScale(2, 2);
      this.add.tileSprite(110, WORLD_SIZE / 2, 60, WORLD_SIZE, 'kenney_road').setTileScale(2, 2);
    }

    // Sidewalks
    const swGfx = this.add.graphics();
    swGfx.fillStyle(COLORS.SIDEWALK);
    swGfx.fillRect(0, 574, WORLD_SIZE, 6);
    swGfx.fillRect(0, 640, WORLD_SIZE, 6);
    swGfx.fillRect(74, 0, 6, WORLD_SIZE);
    swGfx.fillRect(140, 0, 6, WORLD_SIZE);

    if (this.textures.exists('kenney_sidewalk')) {
      // Thin tileSprites over sidewalk strips
      this.add.tileSprite(WORLD_SIZE / 2, 577, WORLD_SIZE, 6, 'kenney_sidewalk').setTileScale(2, 2);
      this.add.tileSprite(WORLD_SIZE / 2, 643, WORLD_SIZE, 6, 'kenney_sidewalk').setTileScale(2, 2);
      this.add.tileSprite(77, WORLD_SIZE / 2, 6, WORLD_SIZE, 'kenney_sidewalk').setTileScale(2, 2);
      this.add.tileSprite(143, WORLD_SIZE / 2, 6, WORLD_SIZE, 'kenney_sidewalk').setTileScale(2, 2);
    }

    // Road markings (dashed yellow centre lines)
    const markGfx = this.add.graphics();
    markGfx.fillStyle(COLORS.YELLOW, 0.6);
    for (let rx = 0; rx < WORLD_SIZE; rx += 60) {
      markGfx.fillRect(rx, 607, 36, 5);
    }
    for (let ry = 0; ry < WORLD_SIZE; ry += 60) {
      markGfx.fillRect(107, ry, 5, 36);
    }

    // Buildings / Locations
    this.buildHomeArea();
    this.buildTennisCourt();
    this.buildSoccerField();
    this.buildPlayground();
    this.buildPark();

    // Trees scattered — use Kenney foliage sprites (white silhouettes, tinted green)
    const treePositions = [
      [200, 450], [260, 480], [180, 530],
      [700, 200], [750, 220], [800, 180],
      [500, 700], [540, 730], [470, 760],
      [200, 800], [240, 850],
      [1000, 400], [1050, 420], [1100, 380],
      [600, 900], [650, 920],
      [1100, 700], [1150, 730],
    ];
    const kenneyTreeKeys = ['kenney_tree_round', 'kenney_tree_alt', 'kenney_tree_pine', 'kenney_tree_bush'];
    const availableKenneyTrees = kenneyTreeKeys.filter(k => this.textures.exists(k));

    treePositions.forEach(([tx, ty], idx) => {
      if (availableKenneyTrees.length > 0) {
        const key = availableKenneyTrees[idx % availableKenneyTrees.length];
        // Foliage sprites are 1024x1024 vector silhouettes — scale down to ~32px and tint green
        const treeImg = this.add.image(tx, ty, key);
        treeImg.setScale(0.03);
        treeImg.setTint(0x4caf50);
      } else if (this.textures.exists('tree')) {
        this.add.image(tx, ty, 'tree');
      } else {
        const tg = this.add.graphics();
        tg.fillStyle(0x795548);
        tg.fillRect(tx - 4, ty - 14, 8, 14);
        tg.fillStyle(0x4caf50);
        tg.fillCircle(tx, ty - 18, 14);
      }
    });
  }

  private buildHomeArea(): void {
    const loc = this.LOCATIONS[0];
    const useKenney = this.textures.exists('kenney_building') && this.textures.exists('kenney_roof');
    if (useKenney) {
      // Build a simple house from Kenney tiles (2x scale = 32px each)
      // Roof row (3 tiles wide)
      for (let col = -1; col <= 1; col++) {
        this.add.image(loc.x + col * 32, loc.y - 32, 'kenney_roof').setScale(2).setTint(0xc0392b);
      }
      // Wall rows (3 wide x 2 tall)
      for (let row = 0; row < 2; row++) {
        for (let col = -1; col <= 1; col++) {
          this.add.image(loc.x + col * 32, loc.y + row * 32, 'kenney_building').setScale(2);
        }
      }
    } else if (this.textures.exists('house')) {
      this.add.image(loc.x, loc.y, 'house');
    } else {
      const g = this.add.graphics();
      g.fillStyle(0xf5deb3);
      g.fillRect(loc.x - 36, loc.y - 22, 72, 44);
      g.fillStyle(0xc0392b);
      g.fillTriangle(loc.x - 40, loc.y - 22, loc.x + 40, loc.y - 22, loc.x, loc.y - 52);
    }
    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildTennisCourt(): void {
    const loc = this.LOCATIONS[1];
    if (this.textures.exists('tennis_court')) {
      this.add.image(loc.x, loc.y, 'tennis_court').setScale(0.7);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x2e7d32);
      g.fillRect(loc.x - 84, loc.y - 56, 168, 112);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(loc.x - 84, loc.y - 56, 168, 112);
      g.lineBetween(loc.x, loc.y - 56, loc.x, loc.y + 56);
    }
    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildSoccerField(): void {
    const loc = this.LOCATIONS[2];
    const g = this.add.graphics();
    g.fillStyle(0x388e3c);
    g.fillRect(loc.x - 100, loc.y - 80, 200, 160);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(loc.x - 90, loc.y - 70, 180, 140);
    g.strokeCircle(loc.x, loc.y, 30);
    g.lineBetween(loc.x - 90, loc.y, loc.x + 90, loc.y);
    // Goals
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(loc.x - 20, loc.y - 80, 40, 10);
    g.fillRect(loc.x - 20, loc.y + 70, 40, 10);
    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildPlayground(): void {
    const loc = this.LOCATIONS[3];
    const g = this.add.graphics();
    // Rubber surface
    g.fillStyle(0xf39c12, 0.7);
    g.fillRect(loc.x - 60, loc.y - 50, 120, 100);
    // Slide
    g.fillStyle(0xe74c3c);
    g.fillRect(loc.x - 40, loc.y - 40, 8, 50);
    g.fillRect(loc.x - 48, loc.y + 5, 30, 6);
    // Swings (poles)
    g.fillStyle(0x607d8b);
    g.fillRect(loc.x + 10, loc.y - 40, 6, 45);
    g.fillRect(loc.x + 30, loc.y - 40, 6, 45);
    g.lineStyle(2, 0x607d8b, 1);
    g.lineBetween(loc.x + 10, loc.y - 40, loc.x + 36, loc.y - 40);
    // Swing seats
    g.fillStyle(0x795548);
    g.fillRect(loc.x + 15, loc.y + 5, 18, 4);
    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildPark(): void {
    const loc = this.LOCATIONS[4];
    const g = this.add.graphics();
    // Open lawn
    g.fillStyle(0x66bb6a, 0.4);
    g.fillRect(loc.x - 100, loc.y - 100, 200, 200);
    // Path
    g.fillStyle(COLORS.SIDEWALK, 0.6);
    g.fillRect(loc.x - 100, loc.y - 8, 200, 16);
    g.fillRect(loc.x - 8, loc.y - 100, 16, 200);
    // Bench
    g.fillStyle(0x795548);
    g.fillRect(loc.x + 40, loc.y - 30, 30, 8);
    g.fillRect(loc.x + 42, loc.y - 22, 6, 10);
    g.fillRect(loc.x + 62, loc.y - 22, 6, 10);
    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private addLocationLabel(loc: LocationData): void {
    this.add.text(loc.x, loc.y - (loc.triggerH / 2) - 16, loc.label, {
      fontSize: '14px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#00000066', padding: { x: 6, y: 2 },
    }).setOrigin(0.5);
  }

  private addTriggerZone(loc: LocationData): void {
    const rect = new Phaser.Geom.Rectangle(
      loc.x - loc.triggerW / 2,
      loc.y + loc.triggerH / 2 - 20,
      loc.triggerW,
      30
    );
    this.triggerZones.push({ zone: rect, data: loc, triggered: false });

    // Debug visual (removed in production)
    // const debugG = this.add.graphics();
    // debugG.lineStyle(1, 0xff0000, 0.5);
    // debugG.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  private setupPlayer(): void {
    const state = SaveManager.load();
    const dadConfig = state.dadConfig;
    const lillianConfig = state.lillianConfig;

    this.playerContainer = CharacterRenderer.create(this, this.playerX, this.playerY, dadConfig, 1.5);
    this.companionContainer = CharacterRenderer.create(this, this.playerX - 40, this.playerY, lillianConfig, 1.5);

    // Car sprite (hidden by default)
    if (this.textures.exists('car')) {
      this.carSprite = this.add.image(this.playerX, this.playerY, 'car');
    } else {
      const carG = this.add.graphics();
      carG.fillStyle(0xe74c3c);
      carG.fillRoundedRect(-24, -14, 48, 28, 6);
      this.carSprite = carG as unknown as Phaser.GameObjects.Image;
    }
    this.carSprite.setVisible(false);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      // Transport toggles
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B).on('down', () => {
        this.setTransport(this.transportMode === 'bike' ? 'walk' : 'bike');
      });
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => {
        this.setTransport(this.transportMode === 'car' ? 'walk' : 'car');
      });
    }

    // Touch input
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // Don't process if touching UI area (bottom 80px)
      if (ptr.y > GAME_HEIGHT - 80) return;
      const worldPt = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      this.touchTarget = { x: worldPt.x, y: worldPt.y };
    });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        const worldPt = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        this.touchTarget = { x: worldPt.x, y: worldPt.y };
      }
    });
    this.input.on('pointerup', () => { this.touchTarget = null; });
  }

  private setupTransportUI(): void {
    // Anchored to camera — we'll update positions in update()
    const walkBtn = this.add.text(0, 0, '\uD83D\uDEB6', {
      fontSize: '22px', backgroundColor: '#2c3e50', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    walkBtn.setPosition(GAME_WIDTH - 150, GAME_HEIGHT - 60);
    walkBtn.on('pointerdown', () => this.setTransport('walk'));

    const bikeBtn = this.add.text(0, 0, '\uD83D\uDEB4', {
      fontSize: '22px', backgroundColor: '#2c3e50', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    bikeBtn.setPosition(GAME_WIDTH - 104, GAME_HEIGHT - 60);
    bikeBtn.on('pointerdown', () => this.setTransport('bike'));

    const carBtn = this.add.text(0, 0, '\uD83D\uDE97', {
      fontSize: '22px', backgroundColor: '#2c3e50', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    carBtn.setPosition(GAME_WIDTH - 58, GAME_HEIGHT - 60);
    carBtn.on('pointerdown', () => this.setTransport('car'));

    this.transportBtns = { walk: walkBtn, bike: bikeBtn, car: carBtn };
    this.updateTransportUI();
  }

  private setTransport(mode: TransportMode): void {
    this.transportMode = mode;
    this.playerContainer.setVisible(mode !== 'car');
    this.carSprite.setVisible(mode === 'car');
    this.companionContainer.setVisible(mode !== 'car');
    this.updateTransportUI();
  }

  private updateTransportUI(): void {
    if (!this.transportBtns) return;
    const { walk, bike, car } = this.transportBtns;
    [walk, bike, car].forEach(btn => {
      btn.setBackgroundColor('#2c3e50');
      btn.setAlpha(0.7);
    });
    const selected = this.transportMode === 'walk' ? walk : this.transportMode === 'bike' ? bike : car;
    selected.setBackgroundColor('#3498db');
    selected.setAlpha(1);
  }

  update(_time: number, delta: number): void {
    if (this.transitioning) return;

    const dt = delta / 1000;
    const speed = this.transportMode === 'walk' ? WALK_SPEED : this.transportMode === 'bike' ? BIKE_SPEED : CAR_SPEED;

    let dx = 0;
    let dy = 0;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;
    }

    // Touch movement
    if (this.touchTarget) {
      const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, this.touchTarget.x, this.touchTarget.y);
      if (dist > 8) {
        dx = (this.touchTarget.x - this.playerX) / dist;
        dy = (this.touchTarget.y - this.playerY) / dist;
      } else {
        this.touchTarget = null;
      }
    }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    this.playerX = Phaser.Math.Clamp(this.playerX + dx * speed * dt, 20, WORLD_SIZE - 20);
    this.playerY = Phaser.Math.Clamp(this.playerY + dy * speed * dt, 20, WORLD_SIZE - 20);

    // Face direction
    if (dx !== 0) {
      this.playerFacingRight = dx > 0;
      this.playerContainer.setScale(this.playerFacingRight ? 1 : -1, 1);
    }

    // Update positions
    if (this.transportMode === 'car') {
      this.carSprite.setPosition(this.playerX, this.playerY);
      if (dx !== 0) this.carSprite.setFlipX(!this.playerFacingRight);
    } else {
      this.playerContainer.setPosition(this.playerX, this.playerY);
    }

    // Companion follows player
    const cx = this.companionContainer.x;
    const cy = this.companionContainer.y;
    const newCx = cx + (this.playerX - cx - (this.playerFacingRight ? -40 : 40)) * 0.1;
    const newCy = cy + (this.playerY - cy + 5) * 0.1;
    this.companionContainer.setPosition(newCx, newCy);

    // Check location triggers
    if (!this.transitioning) {
      this.checkTriggers();
    }

    // Update dialogue position
    if (this.dialogueBubble) {
      this.dialogueBubble.setPosition(this.playerX, this.playerY - 80);
    }
  }

  private checkTriggers(): void {
    for (const trigger of this.triggerZones) {
      if (trigger.triggered) continue;

      if (Phaser.Geom.Rectangle.Contains(trigger.zone, this.playerX, this.playerY)) {
        trigger.triggered = true;
        this.showDialogue(trigger.data);
      }
    }

    // Reset triggers when player leaves
    for (const trigger of this.triggerZones) {
      if (trigger.triggered && this.dialogueBubble === null) {
        if (!Phaser.Geom.Rectangle.Contains(trigger.zone, this.playerX, this.playerY)) {
          trigger.triggered = false;
        }
      }
    }
  }

  private showDialogue(loc: LocationData): void {
    if (this.dialogueBubble) {
      this.dialogueBubble.destroy();
      this.dialogueBubble = null;
    }

    this.dialogueBubble = this.add.container(this.playerX, this.playerY - 80);
    this.dialogueBubble.setDepth(150);

    const bg = this.add.graphics();
    const text = this.add.text(0, 0, loc.dialogue, {
      fontSize: '13px', color: '#1a1a2e',
      align: 'center', wordWrap: { width: 160 },
    }).setOrigin(0.5);

    const tw = text.width + 20;
    const th = text.height + 14;
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 8);
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(-8, th / 2, 8, th / 2, 0, th / 2 + 10);

    this.dialogueBubble.add([bg, text]);

    this.time.delayedCall(1500, () => {
      if (this.dialogueBubble) {
        this.dialogueBubble.destroy();
        this.dialogueBubble = null;
      }
      if (loc.scene && !this.transitioning) {
        this.transitioning = true;
        SceneTransition.switchScene(this, loc.scene);
      }
    });
  }
}
