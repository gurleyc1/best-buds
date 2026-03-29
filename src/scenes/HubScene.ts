import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, WORLD_SIZE, WALK_SPEED, CAR_SPEED } from '../config';
import { CharacterRenderer } from '../systems/CharacterRenderer';
import { SaveManager } from '../systems/SaveManager';
import { SceneTransition } from '../systems/SceneTransition';
import { TransportMode } from '../types';
import { MusicManager } from '../systems/MusicManager';

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
  private playerFacingRight = true;
  private transportMode: TransportMode = 'walk';
  private transportBtns: { walk: Phaser.GameObjects.Text; car: Phaser.GameObjects.Text } | null = null;
  private dialogueBubble: Phaser.GameObjects.Container | null = null;
  private transitioning = false;
  private touchTarget: { x: number; y: number } | null = null;
  private triggerZones: Array<{ zone: Phaser.Geom.Rectangle; data: LocationData; triggered: boolean }> = [];
  private triggerCooldown = 0; // ms remaining before triggers are active
  private readonly TRIGGER_COOLDOWN_MS = 3000;

  // Player starts at home position
  private readonly START_X = 160;
  private readonly START_Y = 260;

  private readonly LOCATIONS: LocationData[] = [
    { x: 160, y: 160, label: 'Home', dialogue: 'Home sweet home!', scene: undefined, triggerW: 80, triggerH: 80 },
    { x: 960, y: 200, label: 'Park', dialogue: 'Keepy uppy time!', scene: SCENE_KEYS.KEEPY_UPPY, triggerW: 80, triggerH: 80 },
    { x: 960, y: 750, label: 'Tennis Court', dialogue: 'Tennis time!', scene: SCENE_KEYS.TENNIS, triggerW: 80, triggerH: 80 },
    { x: 200, y: 900, label: 'Soccer Field', dialogue: 'Penalty kicks!', scene: SCENE_KEYS.SOCCER, triggerW: 80, triggerH: 80 },
    { x: 700, y: 900, label: 'Playground', dialogue: "Let's play on the playground!", scene: SCENE_KEYS.PLAYGROUND, triggerW: 80, triggerH: 80 },
    { x: 400, y: 700, label: 'Ice Cream Shop', dialogue: 'Ice cream time! 🍦', scene: SCENE_KEYS.ICE_CREAM, triggerW: 80, triggerH: 80 },
  ];

  constructor() { super({ key: SCENE_KEYS.HUB }); }

  create(data?: { returnX?: number; returnY?: number }): void {
    const startX = data?.returnX ?? this.START_X;
    const startY = data?.returnY ?? this.START_Y;

    SceneTransition.fadeIn(this, 400);
    MusicManager.resume();
    MusicManager.playTheme('hub');
    this.transitioning = false;
    this.triggerZones = [];
    this.triggerCooldown = this.TRIGGER_COOLDOWN_MS;

    this.buildWorld();
    this.setupPlayer(startX, startY);
    this.setupCamera();
    this.setupInput();
    this.setupTransportUI();

    this.triggerZones.forEach(tz => { tz.triggered = false; });

    // Hint text that fades out after the cooldown period
    const cooldownHint = this.add.text(GAME_WIDTH / 2, 70, 'Walk to a location to play!', {
      fontSize: '13px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: cooldownHint, alpha: 0, duration: 500, onComplete: () => cooldownHint.destroy() });
    });
  }

  // ─── World Building ───────────────────────────────────────────────────────

  private buildWorld(): void {
    const g = this.add.graphics();

    // 1. Grass base — full world
    g.fillStyle(0x5a9e4a);
    g.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // 2. Roads — main cross + connector spurs to each location
    g.fillStyle(0x6b7280);
    // Main horizontal road: y=580–620
    g.fillRect(0, 580, WORLD_SIZE, 40);
    // Main vertical road: x=580–620
    g.fillRect(580, 0, 40, WORLD_SIZE);

    // Connector roads (24px wide, leading from main roads to each activity)
    g.fillStyle(0x7a8390); // slightly lighter than main roads
    // Home (160,160): H arm y=148–172 from x=160 to x=580
    g.fillRect(160, 148, 420, 24);
    // Park (960,200): H arm y=188–212 from x=620 to x=960
    g.fillRect(620, 188, 340, 24);
    // Tennis (960,750): V arm x=948–972 from y=620 to y=750
    g.fillRect(948, 620, 24, 130);
    // Soccer (200,900): V arm x=188–212 from y=620 to y=900
    g.fillRect(188, 620, 24, 280);
    // Playground (700,900): short H spur y=620 then V arm x=688–712 to y=900
    g.fillRect(620, 608, 92, 24); // H link from V road to x=700
    g.fillRect(688, 620, 24, 280); // V arm down to playground
    // Ice Cream (400,700): V arm x=388–412 from y=580 to y=700
    g.fillRect(388, 570, 24, 130);

    // 3. Sidewalks — 16px strips along main roads only
    g.fillStyle(0xd4c5a0);
    g.fillRect(0, 564, WORLD_SIZE, 16); // H road top sidewalk
    g.fillRect(0, 620, WORLD_SIZE, 16); // H road bottom sidewalk
    g.fillRect(564, 0, 16, WORLD_SIZE); // V road left sidewalk
    g.fillRect(620, 0, 16, WORLD_SIZE); // V road right sidewalk

    // 4. Road markings — dashed yellow center lines on main roads
    g.fillStyle(0xfbbf24, 0.6);
    for (let rx = 0; rx < WORLD_SIZE; rx += 60) {
      g.fillRect(rx, 598, 36, 5);
    }
    for (let ry = 0; ry < WORLD_SIZE; ry += 60) {
      g.fillRect(598, ry, 5, 36);
    }

    // 5. Location zones
    this.buildHomeArea(g);
    this.buildPark(g);
    this.buildTennisCourt(g);
    this.buildSoccerField(g);
    this.buildPlayground(g);
    this.buildIceCreamShop(g);

    // 6. Trees — scattered in grass areas, away from roads and buildings
    this.drawTrees();
  }

  private buildHomeArea(g: Phaser.GameObjects.Graphics): void {
    const loc = this.LOCATIONS[0]; // x=160, y=160

    // Yard (beige ground)
    g.fillStyle(0xf5e6d0);
    g.fillRect(loc.x - 80, loc.y - 80, 160, 160);

    // House walls
    g.fillStyle(0xf5e6d0);
    g.fillRect(loc.x - 50, loc.y - 40, 100, 70);

    // Roof — red triangle above walls
    g.fillStyle(0xcc4444);
    g.fillTriangle(
      loc.x - 58, loc.y - 40,
      loc.x + 58, loc.y - 40,
      loc.x, loc.y - 85
    );

    // Door
    g.fillStyle(0x8b5e3c);
    g.fillRect(loc.x - 12, loc.y + 5, 24, 25);

    // Windows
    g.fillStyle(0x87ceeb);
    g.fillRect(loc.x - 40, loc.y - 25, 20, 18);
    g.fillRect(loc.x + 20, loc.y - 25, 20, 18);

    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildPark(g: Phaser.GameObjects.Graphics): void {
    const loc = this.LOCATIONS[1]; // x=960, y=200

    // Open green park area
    g.fillStyle(0x4aaa3a);
    g.fillRect(loc.x - 130, loc.y - 130, 260, 260);

    // Winding path
    g.fillStyle(0xd4c5a0, 0.7);
    g.fillRect(loc.x - 130, loc.y - 10, 260, 20);
    g.fillRect(loc.x - 10, loc.y - 130, 20, 260);

    // Bench
    g.fillStyle(0x795548);
    g.fillRect(loc.x + 40, loc.y - 50, 30, 8);
    g.fillRect(loc.x + 42, loc.y - 42, 6, 10);
    g.fillRect(loc.x + 62, loc.y - 42, 6, 10);

    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildTennisCourt(g: Phaser.GameObjects.Graphics): void {
    const loc = this.LOCATIONS[2]; // x=960, y=600

    // Court surface
    g.fillStyle(0x2d7a3a);
    g.fillRect(loc.x - 100, loc.y - 60, 200, 120);

    // Court lines
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(loc.x - 90, loc.y - 50, 180, 100);
    // Center line
    g.lineBetween(loc.x, loc.y - 50, loc.x, loc.y + 50);
    // Service boxes
    g.lineBetween(loc.x - 90, loc.y, loc.x + 90, loc.y);
    // Net
    g.lineStyle(3, 0xeeeeee, 1);
    g.lineBetween(loc.x, loc.y - 50, loc.x, loc.y + 50);

    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildSoccerField(g: Phaser.GameObjects.Graphics): void {
    const loc = this.LOCATIONS[3]; // x=200, y=900

    // Field surface
    g.fillStyle(0x3a8a3a);
    g.fillRect(loc.x - 130, loc.y - 90, 260, 180);

    // Field markings
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(loc.x - 120, loc.y - 80, 240, 160);
    g.strokeCircle(loc.x, loc.y, 35);
    g.lineBetween(loc.x - 120, loc.y, loc.x + 120, loc.y);

    // Goals
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(loc.x - 25, loc.y - 90, 50, 10);
    g.fillRect(loc.x - 25, loc.y + 80, 50, 10);

    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildPlayground(g: Phaser.GameObjects.Graphics): void {
    const loc = this.LOCATIONS[4]; // x=700, y=900

    // Rubber surface
    g.fillStyle(0xe8c84a);
    g.fillRect(loc.x - 80, loc.y - 60, 160, 120);

    // Slide — pole and ramp
    g.fillStyle(0xe74c3c);
    g.fillRect(loc.x - 50, loc.y - 50, 8, 55);
    g.fillRect(loc.x - 58, loc.y, 36, 6);

    // Swing frame
    g.fillStyle(0x607d8b);
    g.fillRect(loc.x + 15, loc.y - 50, 6, 50);
    g.fillRect(loc.x + 40, loc.y - 50, 6, 50);
    g.lineStyle(2, 0x607d8b, 1);
    g.lineBetween(loc.x + 15, loc.y - 50, loc.x + 46, loc.y - 50);

    // Swing seat
    g.fillStyle(0x795548);
    g.fillRect(loc.x + 20, loc.y + 0, 20, 5);

    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private buildIceCreamShop(g: Phaser.GameObjects.Graphics): void {
    const loc = this.LOCATIONS[5]; // x=400, y=700

    // Building front (light pink)
    g.fillStyle(0xffb3d9);
    g.fillRect(loc.x - 70, loc.y - 70, 140, 120);

    // Awning stripes (pink and white)
    const stripeCount = 7;
    const stripeW = 140 / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      g.fillStyle(i % 2 === 0 ? 0xff69b4 : 0xffffff, 0.9);
      g.fillRect(loc.x - 70 + i * stripeW, loc.y - 70, stripeW, 18);
    }

    // Door
    g.fillStyle(0x8b5e3c);
    g.fillRect(loc.x - 14, loc.y + 14, 28, 36);

    // Window left
    g.fillStyle(0x87ceeb, 0.8);
    g.fillRect(loc.x - 60, loc.y - 40, 30, 28);
    g.lineStyle(1, 0xffffff, 0.9);
    g.lineBetween(loc.x - 45, loc.y - 40, loc.x - 45, loc.y - 12);
    g.lineBetween(loc.x - 60, loc.y - 26, loc.x - 30, loc.y - 26);

    // Window right
    g.fillStyle(0x87ceeb, 0.8);
    g.fillRect(loc.x + 30, loc.y - 40, 30, 28);
    g.lineStyle(1, 0xffffff, 0.9);
    g.lineBetween(loc.x + 45, loc.y - 40, loc.x + 45, loc.y - 12);
    g.lineBetween(loc.x + 30, loc.y - 26, loc.x + 60, loc.y - 26);

    // Ice cream sign on front
    this.add.text(loc.x, loc.y - 52, '🍦', { fontSize: '18px' }).setOrigin(0.5).setDepth(2);

    this.addLocationLabel(loc);
    this.addTriggerZone(loc);
  }

  private drawTrees(): void {
    // Scattered trees in grass areas — away from roads (x=564-636, y=564-636) and buildings
    const treePositions: [number, number][] = [
      // Top-left quadrant (avoid home at 80-240, 80-240)
      [380, 120], [420, 200], [300, 350], [450, 400], [100, 400],
      // Top-right quadrant (around park at 830-1090, 70-330)
      [800, 120], [1100, 100], [1150, 280], [1100, 420], [820, 430],
      // Bottom-left quadrant (around soccer at 70-330, 810-990)
      [380, 780], [420, 1050], [100, 1050], [100, 750],
      // Bottom-right quadrant
      [850, 780], [1050, 800], [1150, 900], [850, 1050], [1100, 1050],
      // Along edges
      [700, 100], [700, 400],
    ];

    treePositions.forEach(([tx, ty]) => {
      this.drawTree(tx, ty);
    });
  }

  private drawTree(tx: number, ty: number): void {
    const g = this.add.graphics();
    // Trunk
    g.fillStyle(0x6b4226);
    g.fillRect(tx - 4, ty + 6, 8, 12);
    // Dark green canopy base circle
    g.fillStyle(0x2d6a1f);
    g.fillCircle(tx, ty, 14);
    // Lighter highlight circle (offset -2, -3)
    g.fillStyle(0x4a9a2a);
    g.fillCircle(tx - 2, ty - 3, 10);
  }

  private addLocationLabel(loc: LocationData): void {
    this.add.text(loc.x, loc.y - (loc.triggerH / 2) - 70, loc.label, {
      fontSize: '14px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#00000066', padding: { x: 6, y: 2 },
    }).setOrigin(0.5);
  }

  private addTriggerZone(loc: LocationData): void {
    const rect = new Phaser.Geom.Rectangle(
      loc.x - loc.triggerW / 2,
      loc.y - loc.triggerH / 2,
      loc.triggerW,
      loc.triggerH
    );
    this.triggerZones.push({ zone: rect, data: loc, triggered: false });
  }

  // ─── Player Setup ─────────────────────────────────────────────────────────

  private setupPlayer(startX: number, startY: number): void {
    const state = SaveManager.load();
    const dadConfig = state.dadConfig;
    const lillianConfig = state.lillianConfig;

    this.playerContainer = CharacterRenderer.create(this, startX, startY, dadConfig, 1.5);
    this.companionContainer = CharacterRenderer.create(this, startX - 40, startY, lillianConfig, 1.5);

    // Enable arcade physics on the player container so world bounds are respected
    this.physics.add.existing(this.playerContainer);
    const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // Car sprite — generate a texture then create a proper Image (supports setFlipX)
    const carGen = this.make.graphics({ x: 0, y: 0 });
    carGen.fillStyle(0xe74c3c);
    carGen.fillRoundedRect(0, 4, 56, 24, 6);
    carGen.fillStyle(0x87ceeb, 0.9);
    carGen.fillRect(8, 6, 16, 12);
    carGen.fillRect(32, 6, 16, 12);
    carGen.fillStyle(0x222222);
    carGen.fillCircle(10, 28, 5);
    carGen.fillCircle(46, 28, 5);
    carGen.fillCircle(10, 4, 5);
    carGen.fillCircle(46, 4, 5);
    carGen.generateTexture('car_hub', 56, 32);
    carGen.destroy();
    this.carSprite = this.add.image(startX, startY, 'car_hub');
    this.carSprite.setVisible(false);
    this.carSprite.setDepth(4);
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  private setupCamera(): void {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupInput(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      // Car toggle (C key)
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => {
        this.setTransport(this.transportMode === 'car' ? 'walk' : 'car');
      });
    }

    // Touch / click input
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.y > GAME_HEIGHT - 80) return; // ignore UI strip
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

  // ─── Transport UI ─────────────────────────────────────────────────────────

  private setupTransportUI(): void {
    // Mute toggle button — scroll-fixed, top-right
    let muted = false;
    const muteBtn = this.add.text(GAME_WIDTH - 10, 10, '🔊', {
      fontSize: '20px',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });

    muteBtn.on('pointerdown', () => {
      muted = !muted;
      MusicManager.setMasterVolume(muted ? 0 : 1);
      muteBtn.setText(muted ? '🔇' : '🔊');
    });

    const walkBtn = this.add.text(0, 0, '\uD83D\uDEB6 Walk', {
      fontSize: '18px', backgroundColor: '#2c3e50', padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    walkBtn.setPosition(GAME_WIDTH - 180, GAME_HEIGHT - 60);
    walkBtn.on('pointerdown', () => this.setTransport('walk'));

    const carBtn = this.add.text(0, 0, '\uD83D\uDE97 Car', {
      fontSize: '18px', backgroundColor: '#2c3e50', padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    carBtn.setPosition(GAME_WIDTH - 90, GAME_HEIGHT - 60);
    carBtn.on('pointerdown', () => this.setTransport('car'));

    this.transportBtns = { walk: walkBtn, car: carBtn };
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
    const { walk, car } = this.transportBtns;
    [walk, car].forEach(btn => {
      btn.setBackgroundColor('#2c3e50');
      btn.setAlpha(0.7);
    });
    const selected = this.transportMode === 'car' ? car : walk;
    selected.setBackgroundColor('#3498db');
    selected.setAlpha(1);
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.transitioning) return;

    const dt = delta / 1000;
    const onRoad = this.isOnRoad(this.playerContainer.x, this.playerContainer.y);
    const speed = this.transportMode === 'car'
      ? (onRoad ? CAR_SPEED : WALK_SPEED)  // car slows to walk speed off-road
      : WALK_SPEED;

    let dx = 0;
    let dy = 0;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;
    }

    // Touch movement
    const px = this.playerContainer.x;
    const py = this.playerContainer.y;

    if (this.touchTarget) {
      const dist = Phaser.Math.Distance.Between(px, py, this.touchTarget.x, this.touchTarget.y);
      if (dist > 8) {
        dx = (this.touchTarget.x - px) / dist;
        dy = (this.touchTarget.y - py) / dist;
      } else {
        this.touchTarget = null;
      }
    }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Apply velocity via physics body so world bounds are enforced
    const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(dx * speed, dy * speed);
    }

    // Face direction
    if (dx !== 0) {
      this.playerFacingRight = dx > 0;
      this.playerContainer.setScale(this.playerFacingRight ? 1.5 : -1.5, 1.5);
    }

    // Sync car position to player
    if (this.transportMode === 'car') {
      this.carSprite.setPosition(this.playerContainer.x, this.playerContainer.y);
      if (dx !== 0) this.carSprite.setFlipX(!this.playerFacingRight);
    }

    // Companion follows player with lag
    const cx = this.companionContainer.x;
    const cy = this.companionContainer.y;
    const offset = this.playerFacingRight ? -40 : 40;
    const newCx = cx + (this.playerContainer.x - cx + offset) * 0.1;
    const newCy = cy + (this.playerContainer.y - cy + 5) * 0.1;
    this.companionContainer.setPosition(newCx, newCy);

    // Check location triggers (skip during entry cooldown)
    if (this.triggerCooldown <= 0) {
      this.checkTriggers();
    } else {
      this.triggerCooldown -= delta;
    }

    // Update floating dialogue position
    if (this.dialogueBubble) {
      this.dialogueBubble.setPosition(this.playerContainer.x, this.playerContainer.y - 80);
    }
  }

  // ─── Road Detection ───────────────────────────────────────────────────────

  private isOnRoad(x: number, y: number): boolean {
    const T = 22; // tolerance in px
    // Main H road
    if (y >= 580 - T && y <= 620 + T) return true;
    // Main V road
    if (x >= 580 - T && x <= 620 + T) return true;
    // Home H arm (y≈160, x=160–580)
    if (y >= 148 - T && y <= 172 + T && x >= 160 && x <= 590) return true;
    // Park H arm (y≈200, x=620–960)
    if (y >= 188 - T && y <= 212 + T && x >= 610 && x <= 970) return true;
    // Tennis V arm (x≈960, y=620–750)
    if (x >= 948 - T && x <= 972 + T && y >= 610 && y <= 760) return true;
    // Soccer V arm (x≈200, y=620–900)
    if (x >= 188 - T && x <= 212 + T && y >= 610 && y <= 910) return true;
    // Playground H link + V arm (x=620–712 at y≈620, then x≈700 y=620–910)
    if (y >= 608 - T && y <= 632 + T && x >= 610 && x <= 715) return true;
    if (x >= 688 - T && x <= 712 + T && y >= 610 && y <= 910) return true;
    // Ice Cream V arm (x≈400, y=570–710)
    if (x >= 388 - T && x <= 412 + T && y >= 560 && y <= 715) return true;
    return false;
  }

  // ─── Triggers ─────────────────────────────────────────────────────────────

  private checkTriggers(): void {
    const px = this.playerContainer.x;
    const py = this.playerContainer.y;

    for (const trigger of this.triggerZones) {
      if (trigger.triggered) continue;
      if (Phaser.Geom.Rectangle.Contains(trigger.zone, px, py)) {
        trigger.triggered = true;
        this.showDialogue(trigger.data);
      }
    }

    // Reset trigger when player leaves zone and dialogue is gone
    for (const trigger of this.triggerZones) {
      if (trigger.triggered && this.dialogueBubble === null) {
        if (!Phaser.Geom.Rectangle.Contains(trigger.zone, px, py)) {
          trigger.triggered = false;
        }
      }
    }
  }

  private showDialogue(loc: LocationData): void {
    MusicManager.sfx('select');
    if (this.dialogueBubble) {
      this.dialogueBubble.destroy();
      this.dialogueBubble = null;
    }

    // Home triggers sleep sequence instead of a mini-game
    if (loc.label === 'Home') {
      this.doSleepSequence();
      return;
    }

    this.dialogueBubble = this.add.container(this.playerContainer.x, this.playerContainer.y - 80);
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
        SceneTransition.fadeOut(this, 300).then(() => {
          this.scene.start(loc.scene!, {
            returnX: this.playerContainer.x,
            returnY: this.playerContainer.y,
          });
        });
      }
    });
  }

  private doSleepSequence(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    MusicManager.stopMusic();

    // Overlay fades to dark blue (night)
    const overlay = this.add.graphics().setScrollFactor(0).setDepth(300);
    overlay.fillStyle(0x0a0a2e, 0);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Stars
    const stars = this.add.graphics().setScrollFactor(0).setDepth(301);
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * GAME_WIDTH;
      const sy = Math.random() * GAME_HEIGHT * 0.6;
      stars.fillStyle(0xffffff, 0.8);
      stars.fillCircle(sx, sy, Math.random() * 2 + 1);
    }
    stars.setAlpha(0);

    // "Zzz" bubbles
    const zzz = this.add.text(
      this.playerContainer.x - this.cameras.main.scrollX + 30,
      this.playerContainer.y - this.cameras.main.scrollY - 20,
      'z z z', {
        fontSize: '22px', color: '#aaaaff', fontStyle: 'italic',
        stroke: '#000033', strokeThickness: 3,
      }
    ).setScrollFactor(0).setDepth(302).setAlpha(0);

    // Moon
    const moon = this.add.graphics().setScrollFactor(0).setDepth(301);
    moon.fillStyle(0xfff5c0);
    moon.fillCircle(GAME_WIDTH - 60, 60, 30);
    moon.fillStyle(0x0a0a2e);
    moon.fillCircle(GAME_WIDTH - 48, 52, 24);
    moon.setAlpha(0);

    // "Good night!" text
    const gn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '🌙 Good night! 🌙', {
      fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000033', strokeThickness: 4,
      backgroundColor: '#00003388', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(303).setAlpha(0);

    // Fade to night
    this.tweens.add({
      targets: overlay, alpha: 0.88, duration: 1400, ease: 'Sine.In',
    });
    this.tweens.add({
      targets: [stars, moon], alpha: 1, duration: 1200, delay: 400,
    });
    this.tweens.add({
      targets: zzz, alpha: 1, y: '-=30', duration: 900, delay: 800,
    });
    this.tweens.add({
      targets: gn, alpha: 1, duration: 600, delay: 1400,
      onComplete: () => {
        // Hold for a moment then fade back to morning
        this.time.delayedCall(1800, () => {
          this.tweens.add({
            targets: [overlay, stars, moon, zzz, gn], alpha: 0,
            duration: 1000,
            onComplete: () => {
              overlay.destroy(); stars.destroy(); moon.destroy();
              zzz.destroy(); gn.destroy();
              this.transitioning = false;
              // Reset trigger so Home can be entered again
              const homeTrigger = this.triggerZones.find(t => t.data.label === 'Home');
              if (homeTrigger) homeTrigger.triggered = false;
            },
          });
        });
      },
    });
  }
}
