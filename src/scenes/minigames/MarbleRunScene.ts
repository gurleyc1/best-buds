import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';

type PieceType = 'straight_h' | 'straight_v' | 'curve_tl' | 'curve_tr' | 'curve_bl' | 'curve_br' | 'funnel' | 'spiral' | 'splitter';

interface GridPiece {
  type: PieceType;
  col: number;
  row: number;
  image: Phaser.GameObjects.Image;
}

interface MarbleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gfx: Phaser.GameObjects.Graphics;
  onPiece: GridPiece | null;
  active: boolean;
}

const CELL = 48;
const GRID_COLS = 7;
const GRID_ROWS = 11;
const GRID_X = 160; // Left offset for palette
const GRID_Y = 60;

const PIECE_PORTS: Record<PieceType, string[]> = {
  straight_h: ['left', 'right'],
  straight_v: ['top', 'bottom'],
  curve_tl: ['top', 'left'],
  curve_tr: ['top', 'right'],
  curve_bl: ['bottom', 'left'],
  curve_br: ['bottom', 'right'],
  funnel: ['top', 'bottom'],
  spiral: ['top', 'bottom'],
  splitter: ['top', 'left', 'right'],
};

const PALETTE_PIECES: PieceType[] = [
  'straight_h', 'straight_v',
  'curve_tl', 'curve_tr',
  'curve_bl', 'curve_br',
  'funnel', 'spiral', 'splitter',
];

export class MarbleRunScene extends BaseMiniGameScene {
  protected gameName = 'marble_run';

  private grid: (GridPiece | null)[][] = [];
  private marbles: MarbleData[] = [];
  private buildMode = true;
  private draggingType: PieceType | null = null;
  private dragGhost: Phaser.GameObjects.Image | null = null;
  private gridContainer!: Phaser.GameObjects.Container;
  private overlayGfx!: Phaser.GameObjects.Graphics;

  constructor() { super({ key: 'MarbleRunScene' }); }

  create(): void {
    this.score1 = 0;
    this.score2 = 0;
    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.marbles = [];

    this.createBackground();
    this.createHUD('Marbles', '');
    this.createGrid();
    this.createPalette();
    this.createControls();
    this.createCharacters();
  }

  private createBackground(): void {
    // Living room interior
    const bg = this.add.graphics();
    // Wall
    bg.fillStyle(0xf5e6d3);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.65);
    // Floor
    bg.fillStyle(0x8b6914);
    bg.fillRect(0, GAME_HEIGHT * 0.65, GAME_WIDTH, GAME_HEIGHT * 0.35);
    // Floor planks
    bg.lineStyle(1, 0x7a5c10, 0.5);
    for (let fy = GAME_HEIGHT * 0.65; fy < GAME_HEIGHT; fy += 18) {
      bg.lineBetween(0, fy, GAME_WIDTH, fy);
    }
    for (let fx = 0; fx < GAME_WIDTH; fx += 80) {
      bg.lineBetween(fx, GAME_HEIGHT * 0.65, fx, GAME_HEIGHT);
    }
    // Bookshelf on right
    bg.fillStyle(0x6d4c41);
    bg.fillRect(GAME_WIDTH - 56, 50, 50, GAME_HEIGHT * 0.5);
    bg.lineStyle(1, 0x5d4037, 1);
    for (let sy = 50; sy < GAME_HEIGHT * 0.5 + 50; sy += 40) {
      bg.lineBetween(GAME_WIDTH - 56, sy, GAME_WIDTH - 6, sy);
    }
    // Books
    const bookColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];
    for (let b = 0; b < 5; b++) {
      bg.fillStyle(bookColors[b % bookColors.length]);
      bg.fillRect(GAME_WIDTH - 52 + b * 8, 58 + Math.floor(b / 5) * 40, 6, 28);
    }
    // Couch on bottom left
    bg.fillStyle(0x8e44ad);
    bg.fillRect(0, GAME_HEIGHT - 100, 80, 70);
    bg.fillStyle(0x9b59b6);
    bg.fillRect(4, GAME_HEIGHT - 110, 76, 20);

    // Marble run frame
    bg.lineStyle(4, 0x5d4037, 1);
    bg.fillStyle(0xd4a96a, 0.3);
    bg.fillRect(GRID_X - 8, GRID_Y - 8, GRID_COLS * CELL + 16, GRID_ROWS * CELL + 16);
    bg.strokeRect(GRID_X - 8, GRID_Y - 8, GRID_COLS * CELL + 16, GRID_ROWS * CELL + 16);

    // Grid lines
    bg.lineStyle(1, 0xcccccc, 0.25);
    for (let c = 0; c <= GRID_COLS; c++) {
      bg.lineBetween(GRID_X + c * CELL, GRID_Y, GRID_X + c * CELL, GRID_Y + GRID_ROWS * CELL);
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      bg.lineBetween(GRID_X, GRID_Y + r * CELL, GRID_X + GRID_COLS * CELL, GRID_Y + r * CELL);
    }

    // Basket at bottom
    bg.fillStyle(0x795548);
    bg.fillRect(GRID_X + GRID_COLS * CELL / 2 - 30, GRID_Y + GRID_ROWS * CELL + 8, 60, 30);
    bg.lineStyle(2, 0x5d4037, 1);
    bg.strokeRect(GRID_X + GRID_COLS * CELL / 2 - 30, GRID_Y + GRID_ROWS * CELL + 8, 60, 30);

    this.overlayGfx = this.add.graphics();
    this.overlayGfx.setDepth(20);

    this.gridContainer = this.add.container(0, 0);
    this.gridContainer.setDepth(5);
  }

  private createGrid(): void {
    // Place a few default pieces to get started
    this.placePiece('funnel', 3, 0);
    this.placePiece('straight_v', 3, 1);
    this.placePiece('curve_br', 3, 2);
    this.placePiece('straight_h', 4, 2);
    this.placePiece('curve_bl', 5, 2);
    this.placePiece('straight_v', 5, 3);
  }

  private placePiece(type: PieceType, col: number, row: number): void {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    if (this.grid[row][col]) {
      this.grid[row][col]!.image.destroy();
    }
    const px = GRID_X + col * CELL + CELL / 2;
    const py = GRID_Y + row * CELL + CELL / 2;
    const textureKey = 'piece_' + type;
    let img: Phaser.GameObjects.Image;
    if (this.textures.exists(textureKey)) {
      img = this.add.image(px, py, textureKey);
    } else {
      // Fallback colored rectangle
      const fallGfx = this.add.graphics();
      const pieceColor = type.startsWith('curve') ? 0x2980b9 : type === 'funnel' ? 0xe67e22 : type === 'spiral' ? 0x9b59b6 : 0x2ecc71;
      fallGfx.fillStyle(pieceColor);
      fallGfx.fillRect(px - CELL / 2 + 4, py - CELL / 2 + 4, CELL - 8, CELL - 8);
      img = fallGfx as unknown as Phaser.GameObjects.Image;
    }
    img.setDepth(5);
    this.gridContainer.add(img);

    const piece: GridPiece = { type, col, row, image: img };
    this.grid[row][col] = piece;
    this.updateConnections();
  }

  private removePieceAt(col: number, row: number): void {
    if (this.grid[row]?.[col]) {
      this.grid[row][col]!.image.destroy();
      this.grid[row][col] = null;
      this.updateConnections();
    }
  }

  private updateConnections(): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const piece = this.grid[r][c];
        if (!piece) continue;
        let connected = false;
        const ports = PIECE_PORTS[piece.type];
        if (ports.includes('top') && r > 0 && this.grid[r - 1][c]) {
          const other = this.grid[r - 1][c]!;
          if (PIECE_PORTS[other.type].includes('bottom')) connected = true;
        }
        if (ports.includes('bottom') && r < GRID_ROWS - 1 && this.grid[r + 1][c]) {
          const other = this.grid[r + 1][c]!;
          if (PIECE_PORTS[other.type].includes('top')) connected = true;
        }
        if (ports.includes('left') && c > 0 && this.grid[r][c - 1]) {
          const other = this.grid[r][c - 1]!;
          if (PIECE_PORTS[other.type].includes('right')) connected = true;
        }
        if (ports.includes('right') && c < GRID_COLS - 1 && this.grid[r][c + 1]) {
          const other = this.grid[r][c + 1]!;
          if (PIECE_PORTS[other.type].includes('left')) connected = true;
        }
        piece.image.setTint(connected ? 0xaaffaa : 0xffffff);
      }
    }
  }

  private createPalette(): void {
    const palBg = this.add.graphics();
    palBg.fillStyle(0x16213e, 0.9);
    palBg.fillRoundedRect(4, 50, 150, GAME_HEIGHT - 60, 6);

    this.add.text(78, 62, 'PIECES', { fontSize: '11px', color: '#ffd700' }).setOrigin(0.5);

    PALETTE_PIECES.forEach((type, i) => {
      const px = 78;
      const py = 88 + i * 72;
      const textureKey = 'piece_' + type;

      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x2c3e50);
      itemBg.fillRoundedRect(10, py - 24, 136, 56, 4);

      let img: Phaser.GameObjects.Image;
      if (this.textures.exists(textureKey)) {
        img = this.add.image(px, py, textureKey).setScale(0.7);
      } else {
        const ig = this.add.graphics();
        ig.fillStyle(0x3498db);
        ig.fillRect(px - 18, py - 18, 36, 28);
        img = ig as unknown as Phaser.GameObjects.Image;
      }
      img.setDepth(10);

      const label = type.replace(/_/g, ' ').replace('curve ', 'crv ');
      this.add.text(px, py + 20, label, { fontSize: '9px', color: '#aaaaaa' }).setOrigin(0.5).setDepth(10);

      const zone = this.add.zone(px, py, 136, 56).setInteractive({ useHandCursor: true, draggable: true });
      zone.setDepth(15);

      zone.on('dragstart', () => {
        this.draggingType = type;
        const ghostKey = textureKey;
        if (this.textures.exists(ghostKey)) {
          this.dragGhost = this.add.image(0, 0, ghostKey).setAlpha(0.7).setDepth(50);
        }
      });

      zone.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.dragGhost) {
          this.dragGhost.setPosition(dragX, dragY);
        }
      });

      zone.on('dragend', (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.dragGhost) { this.dragGhost.destroy(); this.dragGhost = null; }
        if (this.draggingType) {
          const col = Math.round((dragX - GRID_X - CELL / 2) / CELL);
          const row = Math.round((dragY - GRID_Y - CELL / 2) / CELL);
          if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
            if (this.buildMode) {
              this.placePiece(this.draggingType, col, row);
            }
          }
          this.draggingType = null;
        }
      });

      this.input.setDraggable(zone);
    });
  }

  private createControls(): void {
    // Add marble button
    const addMarbleBtn = this.add.text(GAME_WIDTH / 2 + 50, 30, '+ Marble', {
      fontSize: '14px', color: '#3498db',
      backgroundColor: '#162040', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    addMarbleBtn.on('pointerdown', () => this.addMarble());

    // Build / Remove toggle
    const modeBtn = this.add.text(GAME_WIDTH / 2 - 50, 30, '✏️ Build', {
      fontSize: '14px', color: '#2ecc71',
      backgroundColor: '#162040', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    modeBtn.on('pointerdown', () => {
      this.buildMode = !this.buildMode;
      modeBtn.setText(this.buildMode ? '✏️ Build' : '🗑️ Remove');
      modeBtn.setColor(this.buildMode ? '#2ecc71' : '#e74c3c');
    });

    // Click to remove in remove mode
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.buildMode) {
        const col = Math.floor((ptr.x - GRID_X) / CELL);
        const row = Math.floor((ptr.y - GRID_Y) / CELL);
        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
          this.removePieceAt(col, row);
        }
      }
    });
  }

  private createCharacters(): void {
    const state = SaveManager.load();
    CharacterRenderer.create(this, 22, GAME_HEIGHT - 70, state.dadConfig, 1.2).setDepth(4);
    CharacterRenderer.create(this, 54, GAME_HEIGHT - 60, state.lillianConfig, 1).setDepth(4);
  }

  private addMarble(): void {
    if (this.marbles.length >= 10) return;
    // Find topmost piece
    let startX = GRID_X + GRID_COLS * CELL / 2;
    let startY = GRID_Y + 10;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const piece = this.grid[r][c];
        if (piece) {
          startX = GRID_X + c * CELL + CELL / 2;
          startY = GRID_Y + r * CELL;
          break;
        }
      }
      if (startY !== GRID_Y + 10) break;
    }

    const gfx = this.add.graphics();
    gfx.setDepth(15);
    const marble: MarbleData = {
      x: startX, y: startY, vx: 0, vy: 0, gfx, onPiece: null, active: true,
    };
    this.marbles.push(marble);
    this.addScore(1);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.marbles = this.marbles.filter(m => {
      if (!m.active) { m.gfx.destroy(); return false; }
      return true;
    });

    for (const marble of this.marbles) {
      this.updateMarble(marble, dt);
    }

    this.drawOverlay();
  }

  private updateMarble(marble: MarbleData, dt: number): void {
    const gravity = 200;
    marble.vy += gravity * dt;

    const col = Math.floor((marble.x - GRID_X) / CELL);
    const row = Math.floor((marble.y - GRID_Y) / CELL);
    const piece = (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) ? this.grid[row][col] : null;

    if (piece) {
      marble.onPiece = piece;
      const cx = GRID_X + piece.col * CELL + CELL / 2;
      const cy = GRID_Y + piece.row * CELL + CELL / 2;

      switch (piece.type) {
        case 'straight_v':
          // Falls straight down, snap to center x
          marble.x += (cx - marble.x) * 0.3;
          marble.vx *= 0.8;
          break;
        case 'straight_h':
          // Slides horizontally with slight downward slope
          marble.vx = marble.vx === 0 ? 80 : marble.vx;
          marble.vy = 30;
          marble.y += (cy - marble.y) * 0.1;
          break;
        case 'curve_br':
          if (marble.vy > 0 && marble.vx >= 0) { marble.vx = 120; marble.vy = 0; }
          marble.y += (cy - marble.y) * 0.1;
          break;
        case 'curve_bl':
          if (marble.vy > 0 && marble.vx <= 0) { marble.vx = -120; marble.vy = 0; }
          marble.y += (cy - marble.y) * 0.1;
          break;
        case 'curve_tr':
          if (marble.vx > 0) { marble.vx = 0; marble.vy = 120; }
          marble.x += (cx - marble.x) * 0.1;
          break;
        case 'curve_tl':
          if (marble.vx < 0) { marble.vx = 0; marble.vy = 120; }
          marble.x += (cx - marble.x) * 0.1;
          break;
        case 'funnel':
          marble.x += (cx - marble.x) * 0.2;
          marble.vx *= 0.5;
          break;
        case 'spiral':
          // Spiral movement - rotates around center
          marble.vy = 60;
          marble.vx = Math.sin(marble.y * 0.15) * 80;
          marble.x += (cx - marble.x) * 0.05;
          break;
        case 'splitter':
          if (Math.random() < 0.01) {
            marble.vx = Math.random() < 0.5 ? -100 : 100;
            marble.vy = 0;
          }
          marble.x += (cx - marble.x) * 0.05;
          break;
      }
    } else {
      marble.onPiece = null;
    }

    marble.x += marble.vx * dt;
    marble.y += marble.vy * dt;

    // World bounds
    if (marble.x < GRID_X) { marble.x = GRID_X; marble.vx *= -0.6; }
    if (marble.x > GRID_X + GRID_COLS * CELL) { marble.x = GRID_X + GRID_COLS * CELL; marble.vx *= -0.6; }

    // Off bottom - collect in basket
    if (marble.y > GRID_Y + GRID_ROWS * CELL + 30) {
      marble.active = false;
    }

    // Draw marble
    marble.gfx.clear();
    if (this.textures.exists('marble')) {
      // Image already handles visuals
    }
    marble.gfx.fillStyle(0x3498db);
    marble.gfx.fillCircle(marble.x, marble.y, 7);
    marble.gfx.fillStyle(0x85c1e9, 0.8);
    marble.gfx.fillCircle(marble.x - 2, marble.y - 2, 3);
    marble.gfx.fillStyle(0xffffff, 0.5);
    marble.gfx.fillCircle(marble.x - 1, marble.y - 2, 1.5);
  }

  private drawOverlay(): void {
    this.overlayGfx.clear();
    // Draw marble shadows
    for (const marble of this.marbles) {
      this.overlayGfx.fillStyle(0x000000, 0.15);
      this.overlayGfx.fillEllipse(marble.x, marble.y + 8, 12, 4);
    }
  }
}
