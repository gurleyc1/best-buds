import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { CharacterRenderer } from '../../systems/CharacterRenderer';
import { SaveManager } from '../../systems/SaveManager';
import { BaseMiniGameScene } from './BaseMiniGameScene';

// ─── Types ────────────────────────────────────────────────────────────────────

type PieceType =
  | 'straight_h'
  | 'straight_v'
  | 'curve_ne'
  | 'curve_nw'
  | 'curve_se'
  | 'curve_sw'
  | 'funnel'
  | 'splitter';

type Socket = 'N' | 'S' | 'E' | 'W';

// Which sockets does each piece type expose?
// curve_se / curve_sw use N (top) as their gravity-fed entry instead of S,
// so falling marbles can enter them from above.
const PIECE_SOCKETS: Record<PieceType, Socket[]> = {
  straight_h: ['E', 'W'],
  straight_v: ['N', 'S'],
  curve_ne:   ['N', 'E'],
  curve_nw:   ['N', 'W'],
  curve_se:   ['N', 'E'],   // N replaces S: marble enters top, exits right
  curve_sw:   ['N', 'W'],   // N replaces S: marble enters top, exits left; W for horizontal entry
  funnel:     ['N', 'S'],
  splitter:   ['N', 'E', 'W'],
};

// Given entry socket, what is the exit socket?
// Primary model: gravity pulls marbles down, so N is the main entry for most pieces.
// curve_ne / curve_se: enter top (N) → exit right (E); enter left (W) → exit down (S)
// curve_nw / curve_sw: enter top (N) → exit left (W); enter right (E) → exit down (S)
//   Special case for curve_sw: also maps W→S so a marble rolling in from the right
//   (entering via the W socket) is redirected downward.
const EXIT_SOCKET: Record<PieceType, Partial<Record<Socket, Socket>>> = {
  straight_h: { E: 'W', W: 'E' },
  straight_v: { N: 'S', S: 'N' },
  curve_ne:   { N: 'E', W: 'S' },
  curve_nw:   { N: 'W', E: 'S' },
  curve_se:   { N: 'E', W: 'S' },
  curve_sw:   { N: 'W', E: 'S', W: 'S' },
  funnel:     { N: 'S' },
  splitter:   { N: 'E' },           // splitter code overrides exit direction per splitterFlip
};

// Opposite socket
function opposite(s: Socket): Socket {
  return s === 'N' ? 'S' : s === 'S' ? 'N' : s === 'E' ? 'W' : 'E';
}

// Direction delta for each socket (dc=col offset, dr=row offset)
function socketDelta(s: Socket): { dc: number; dr: number } {
  return s === 'N' ? { dc: 0, dr: -1 }
    : s === 'S' ? { dc: 0, dr: 1 }
    : s === 'E' ? { dc: 1, dr: 0 }
    : { dc: -1, dr: 0 };
}

// Pixel offset of socket center relative to cell center
function socketOffset(s: Socket, cell: number): { ox: number; oy: number } {
  const h = cell / 2;
  return s === 'N' ? { ox: 0, oy: -h }
    : s === 'S' ? { ox: 0, oy: h }
    : s === 'E' ? { ox: h, oy: 0 }
    : { ox: -h, oy: 0 };
}

interface GridPiece {
  type: PieceType;
  col: number;
  row: number;
  gfx: Phaser.GameObjects.Graphics;
  splitterFlip: boolean;
}

interface MarbleState {
  col: number;
  row: number;
  entrySocket: Socket;
  t: number;
  freefall: boolean;
  px: number;
  py: number;
  pvx: number;
  pvy: number;
  gfx: Phaser.GameObjects.Graphics;
  active: boolean;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const CELL = 48;
const PALETTE_W = 130;
const GRID_COLS = 7;
const GRID_ROWS = 12;
const GRID_X = PALETTE_W + 4;
const GRID_Y = 56;
const MARBLE_SPEED = 150;
const MAX_MARBLES = 10;

const PALETTE_PIECES: PieceType[] = [
  'straight_h',
  'straight_v',
  'curve_ne',
  'curve_nw',
  'curve_se',
  'curve_sw',
  'funnel',
  'splitter',
];

const PIECE_LABELS: Record<PieceType, string> = {
  straight_h: 'Horiz',
  straight_v: 'Vert',
  curve_ne:   'Crv NE',
  curve_nw:   'Crv NW',
  curve_se:   'Crv SE',
  curve_sw:   'Crv SW',
  funnel:     'Funnel',
  splitter:   'Y Split',
};

// ─── Scene ────────────────────────────────────────────────────────────────────

export class MarbleRunScene extends BaseMiniGameScene {
  protected gameName = 'marble_run';

  private grid: (GridPiece | null)[][] = [];
  private marbles: MarbleState[] = [];
  private buildMode = true;
  private modeBtnText!: Phaser.GameObjects.Text;
  private draggingType: PieceType | null = null;
  private dragGhost!: Phaser.GameObjects.Graphics;
  private dragGhostLabel!: Phaser.GameObjects.Text;
  private snapHighlight!: Phaser.GameObjects.Graphics;
  private connectionGfx!: Phaser.GameObjects.Graphics;
  private tutorialOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MarbleRunScene' });
  }

  create(): void {
    this.score1 = 0;
    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.marbles = [];
    this.buildMode = true;

    this.createBackground();
    this.createHUD('Marbles Dropped', '');
    this.createPalette();
    this.createControls();
    this.createCharacters();
    this.createDragSystem();
    this.createTutorialOverlay();
    this.placeSampleRun();
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
    this.redrawConnectionDots();
  }

  private createBackground(): void {
    const bg = this.add.graphics();

    // Beige wall
    bg.fillStyle(0xf5e6d3);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.68);

    // Baseboard
    bg.fillStyle(0xd4b896);
    bg.fillRect(0, GAME_HEIGHT * 0.68 - 10, GAME_WIDTH, 10);

    // Wooden floor
    bg.fillStyle(0x8b6914);
    bg.fillRect(0, GAME_HEIGHT * 0.68, GAME_WIDTH, GAME_HEIGHT * 0.32);

    // Floor planks
    bg.lineStyle(1, 0x7a5c10, 0.5);
    for (let fy = GAME_HEIGHT * 0.68; fy < GAME_HEIGHT; fy += 20) {
      bg.lineBetween(0, fy, GAME_WIDTH, fy);
    }
    for (let col = 0; col < 8; col++) {
      bg.lineBetween(col * 70, GAME_HEIGHT * 0.68, col * 70, GAME_HEIGHT);
    }

    // Bookshelf on right wall
    const shelfX = GAME_WIDTH - 50;
    bg.fillStyle(0x6d4c41);
    bg.fillRect(shelfX, 55, 44, GAME_HEIGHT * 0.55);
    bg.lineStyle(1, 0x4e342e, 1);
    for (let sy = 55; sy < GAME_HEIGHT * 0.55 + 55; sy += 42) {
      bg.lineBetween(shelfX, sy, shelfX + 44, sy);
    }
    const bookColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xe67e22, 0x1abc9c];
    let bx = shelfX + 3;
    for (let b = 0; b < 14; b++) {
      const shelfRow = Math.floor(b / 4);
      const bookW = 8 + (b % 3) * 2;
      const bookH = 24 + (b % 2) * 6;
      bg.fillStyle(bookColors[b % bookColors.length]);
      bg.fillRect(bx, 60 + shelfRow * 42, bookW, bookH);
      bx += bookW + 2;
      if (bx > shelfX + 40) { bx = shelfX + 3; }
    }

    // Couch bottom left
    bg.fillStyle(0x7b1fa2);
    bg.fillRect(0, GAME_HEIGHT - 90, 90, 60);
    bg.fillStyle(0x9c27b0);
    bg.fillRect(4, GAME_HEIGHT - 102, 82, 16);
    bg.fillStyle(0x7b1fa2);
    bg.fillRect(0, GAME_HEIGHT - 102, 10, 70);
    bg.fillRect(82, GAME_HEIGHT - 102, 10, 70);
    bg.fillStyle(0xab47bc);
    bg.fillRoundedRect(12, GAME_HEIGHT - 88, 30, 42, 4);
    bg.fillRoundedRect(50, GAME_HEIGHT - 88, 30, 42, 4);

    // Marble run wooden frame
    bg.lineStyle(5, 0x5d4037, 1);
    bg.fillStyle(0xd4a96a, 0.15);
    bg.fillRect(GRID_X - 10, GRID_Y - 6, GRID_COLS * CELL + 20, GRID_ROWS * CELL + 12);
    bg.strokeRect(GRID_X - 10, GRID_Y - 6, GRID_COLS * CELL + 20, GRID_ROWS * CELL + 12);

    // Visible grid lines
    bg.lineStyle(1, 0xbbbbbb, 0.4);
    for (let c = 0; c <= GRID_COLS; c++) {
      bg.lineBetween(
        GRID_X + c * CELL, GRID_Y,
        GRID_X + c * CELL, GRID_Y + GRID_ROWS * CELL,
      );
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      bg.lineBetween(
        GRID_X, GRID_Y + r * CELL,
        GRID_X + GRID_COLS * CELL, GRID_Y + r * CELL,
      );
    }

    // Collection tray at bottom
    const trayX = GRID_X + GRID_COLS * CELL / 2 - 44;
    const trayY = GRID_Y + GRID_ROWS * CELL + 8;
    bg.fillStyle(0x5d4037);
    bg.fillRect(trayX, trayY, 88, 24);
    bg.fillStyle(0x795548);
    bg.fillRect(trayX + 2, trayY + 2, 84, 20);
    bg.lineStyle(2, 0x4e342e, 1);
    bg.strokeRect(trayX, trayY, 88, 24);
    bg.setDepth(0);

    this.add.text(GRID_X + GRID_COLS * CELL / 2, trayY + 12, 'CATCH TRAY', {
      fontSize: '9px', color: '#d4a96a',
    }).setOrigin(0.5).setDepth(3);

    this.snapHighlight = this.add.graphics();
    this.snapHighlight.setDepth(8);

    this.connectionGfx = this.add.graphics();
    this.connectionGfx.setDepth(12);
  }

  private drawPiece(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    type: PieceType,
  ): void {
    const h = CELL / 2;
    const tube = 10;
    const tubeColor = 0x2980b9;
    const tubeOutline = 0x1a5276;

    gfx.clear();

    switch (type) {
      case 'straight_h': {
        gfx.fillStyle(tubeColor);
        gfx.fillRoundedRect(cx - h + 2, cy - tube, CELL - 4, tube * 2, 6);
        gfx.lineStyle(2, tubeOutline, 1);
        gfx.strokeRoundedRect(cx - h + 2, cy - tube, CELL - 4, tube * 2, 6);
        gfx.fillStyle(0x85c1e9, 0.5);
        gfx.fillRoundedRect(cx - h + 4, cy - tube + 2, CELL - 8, 5, 3);
        break;
      }
      case 'straight_v': {
        gfx.fillStyle(tubeColor);
        gfx.fillRoundedRect(cx - tube, cy - h + 2, tube * 2, CELL - 4, 6);
        gfx.lineStyle(2, tubeOutline, 1);
        gfx.strokeRoundedRect(cx - tube, cy - h + 2, tube * 2, CELL - 4, 6);
        gfx.fillStyle(0x85c1e9, 0.5);
        gfx.fillRoundedRect(cx - tube + 2, cy - h + 4, 5, CELL - 8, 3);
        break;
      }
      case 'curve_ne': {
        // Marble enters from top (N), exits right (E) — pivot at bottom-left corner
        this.drawCurveArc(gfx, cx - h, cy + h, h - tube, tube, Math.PI * 1.5, Math.PI * 2, false);
        break;
      }
      case 'curve_nw': {
        // Marble enters from top (N), exits left (W) — pivot at bottom-right corner
        this.drawCurveArc(gfx, cx + h, cy + h, h - tube, tube, Math.PI, Math.PI * 1.5, true);
        break;
      }
      case 'curve_se': {
        // Marble enters from top (N), exits right (E) — same as curve_ne (gravity entry)
        this.drawCurveArc(gfx, cx - h, cy + h, h - tube, tube, Math.PI * 1.5, Math.PI * 2, false);
        // Add tint to distinguish from curve_ne
        gfx.lineStyle(2, 0x0a3d6b, 1);
        gfx.strokeRect(cx - h + 1, cy - h + 1, CELL - 2, CELL - 2);
        break;
      }
      case 'curve_sw': {
        // Marble enters from top (N), exits left (W) — same routing as curve_nw (gravity entry)
        this.drawCurveArc(gfx, cx + h, cy + h, h - tube, tube, Math.PI, Math.PI * 1.5, true);
        // Add tint to distinguish from curve_nw
        gfx.lineStyle(2, 0x0a3d6b, 1);
        gfx.strokeRect(cx - h + 1, cy - h + 1, CELL - 2, CELL - 2);
        break;
      }
      case 'funnel': {
        gfx.fillStyle(0xe67e22);
        gfx.beginPath();
        gfx.moveTo(cx - h + 4, cy - h + 4);
        gfx.lineTo(cx + h - 4, cy - h + 4);
        gfx.lineTo(cx + tube, cy + h - 4);
        gfx.lineTo(cx - tube, cy + h - 4);
        gfx.closePath();
        gfx.fillPath();
        gfx.lineStyle(2, 0xd35400, 1);
        gfx.beginPath();
        gfx.moveTo(cx - h + 4, cy - h + 4);
        gfx.lineTo(cx + h - 4, cy - h + 4);
        gfx.lineTo(cx + tube, cy + h - 4);
        gfx.lineTo(cx - tube, cy + h - 4);
        gfx.closePath();
        gfx.strokePath();
        gfx.fillStyle(0xf0a060, 0.5);
        gfx.fillTriangle(cx - h + 6, cy - h + 6, cx + h - 6, cy - h + 6, cx - h + 16, cy - h + 16);
        break;
      }
      case 'splitter': {
        gfx.lineStyle(tube * 2, 0x27ae60, 1);
        gfx.beginPath();
        gfx.moveTo(cx, cy - h + 4);
        gfx.lineTo(cx, cy);
        gfx.strokePath();
        gfx.beginPath();
        gfx.moveTo(cx, cy);
        gfx.lineTo(cx - h + 4, cy + h - 4);
        gfx.strokePath();
        gfx.beginPath();
        gfx.moveTo(cx, cy);
        gfx.lineTo(cx + h - 4, cy + h - 4);
        gfx.strokePath();
        gfx.lineStyle(2, 0x1e8449, 1);
        gfx.beginPath();
        gfx.moveTo(cx, cy - h + 4);
        gfx.lineTo(cx, cy);
        gfx.lineTo(cx - h + 4, cy + h - 4);
        gfx.strokePath();
        gfx.beginPath();
        gfx.moveTo(cx, cy);
        gfx.lineTo(cx + h - 4, cy + h - 4);
        gfx.strokePath();
        break;
      }
    }
  }

  private drawCurveArc(
    gfx: Phaser.GameObjects.Graphics,
    pivotX: number,
    pivotY: number,
    innerR: number,
    thickness: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
  ): void {
    const outerR = innerR + thickness * 2;
    const midR = innerR + thickness;

    gfx.fillStyle(0x2980b9);
    gfx.beginPath();
    gfx.arc(pivotX, pivotY, outerR, startAngle, endAngle, !clockwise);
    gfx.arc(pivotX, pivotY, innerR, endAngle, startAngle, clockwise);
    gfx.closePath();
    gfx.fillPath();

    gfx.lineStyle(2, 0x1a5276, 1);
    gfx.beginPath();
    gfx.arc(pivotX, pivotY, outerR, startAngle, endAngle, !clockwise);
    gfx.strokePath();
    gfx.beginPath();
    gfx.arc(pivotX, pivotY, innerR, startAngle, endAngle, !clockwise);
    gfx.strokePath();

    gfx.lineStyle(3, 0x85c1e9, 0.5);
    gfx.beginPath();
    gfx.arc(pivotX, pivotY, midR, startAngle, endAngle, !clockwise);
    gfx.strokePath();
  }

  private placePiece(type: PieceType, col: number, row: number): void {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) { return; }
    if (this.grid[row][col]) {
      this.grid[row][col]!.gfx.destroy();
    }
    const cx = GRID_X + col * CELL + CELL / 2;
    const cy = GRID_Y + row * CELL + CELL / 2;
    const gfx = this.add.graphics();
    gfx.setDepth(6);
    this.drawPiece(gfx, cx, cy, type);

    const piece: GridPiece = { type, col, row, gfx, splitterFlip: false };
    this.grid[row][col] = piece;
  }

  private removePieceAt(col: number, row: number): void {
    const piece = this.grid[row]?.[col];
    if (piece) {
      piece.gfx.destroy();
      this.grid[row][col] = null;
    }
  }

  private redrawConnectionDots(): void {
    this.connectionGfx.clear();

    // Yellow connected dots
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const piece = this.grid[r][c];
        if (!piece) { continue; }
        for (const sock of PIECE_SOCKETS[piece.type]) {
          const { dc, dr } = socketDelta(sock);
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) { continue; }
          const neighbor = this.grid[nr][nc];
          if (!neighbor) { continue; }
          const neighborSock = opposite(sock);
          if (!PIECE_SOCKETS[neighbor.type].includes(neighborSock)) { continue; }

          const { ox, oy } = socketOffset(sock, CELL);
          const dotX = GRID_X + c * CELL + CELL / 2 + ox;
          const dotY = GRID_Y + r * CELL + CELL / 2 + oy;
          this.connectionGfx.fillStyle(0xf1c40f, 1);
          this.connectionGfx.fillCircle(dotX, dotY, 5);
          this.connectionGfx.lineStyle(1.5, 0xe67e22, 1);
          this.connectionGfx.strokeCircle(dotX, dotY, 5);
        }
      }
    }

    // Gray unconnected socket dots
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const piece = this.grid[r][c];
        if (!piece) { continue; }
        for (const sock of PIECE_SOCKETS[piece.type]) {
          const { dc, dr } = socketDelta(sock);
          const nc = c + dc;
          const nr = r + dr;
          const connected =
            nc >= 0 && nc < GRID_COLS &&
            nr >= 0 && nr < GRID_ROWS &&
            !!this.grid[nr]?.[nc] &&
            PIECE_SOCKETS[this.grid[nr]![nc]!.type].includes(opposite(sock));
          if (!connected) {
            const { ox, oy } = socketOffset(sock, CELL);
            const dotX = GRID_X + c * CELL + CELL / 2 + ox;
            const dotY = GRID_Y + r * CELL + CELL / 2 + oy;
            this.connectionGfx.fillStyle(0xaaaaaa, 0.6);
            this.connectionGfx.fillCircle(dotX, dotY, 4);
          }
        }
      }
    }
  }

  private createPalette(): void {
    const palBg = this.add.graphics();
    palBg.fillStyle(0x1a2744, 0.95);
    palBg.fillRoundedRect(2, 55, PALETTE_W - 4, GAME_HEIGHT - 62, 8);
    palBg.setDepth(9);

    this.add.text(PALETTE_W / 2, 66, 'PIECES', {
      fontSize: '11px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(PALETTE_W / 2, 78, 'drag to grid', {
      fontSize: '8px', color: '#888888',
    }).setOrigin(0.5).setDepth(10);

    const itemH = 68;
    PALETTE_PIECES.forEach((type, i) => {
      const itemY = 88 + i * itemH;
      const itemCX = PALETTE_W / 2;
      const itemCY = itemY + 24;

      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x243052);
      itemBg.fillRoundedRect(6, itemY, PALETTE_W - 12, itemH - 4, 6);
      itemBg.setDepth(9);

      const previewGfx = this.add.graphics();
      previewGfx.setDepth(10);
      this.drawPiece(previewGfx, itemCX, itemCY, type);

      this.add.text(itemCX, itemY + itemH - 10, PIECE_LABELS[type], {
        fontSize: '8px', color: '#aaccff',
      }).setOrigin(0.5).setDepth(10);

      const zone = this.add.zone(itemCX, itemCY, PALETTE_W - 12, itemH - 4)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setDepth(11);

      this.input.setDraggable(zone);

      zone.on('dragstart', (ptr: Phaser.Input.Pointer) => {
        this.draggingType = type;
        this.dragGhost.setVisible(true);
        this.dragGhostLabel.setVisible(true);
        this.drawPiece(this.dragGhost, ptr.x, ptr.y, type);
        this.dragGhostLabel.setPosition(ptr.x, ptr.y + 26);
        this.dragGhostLabel.setText(PIECE_LABELS[type]);
      });

      zone.on('drag', (ptr: Phaser.Input.Pointer) => {
        const px = ptr.x;
        const py = ptr.y;
        this.drawPiece(this.dragGhost, px, py, type);
        this.dragGhostLabel.setPosition(px, py + 26);

        this.snapHighlight.clear();
        if (px >= GRID_X && px < GRID_X + GRID_COLS * CELL &&
            py >= GRID_Y && py < GRID_Y + GRID_ROWS * CELL) {
          const snapCol = Math.floor((px - GRID_X) / CELL);
          const snapRow = Math.floor((py - GRID_Y) / CELL);
          this.snapHighlight.lineStyle(3, 0x00ff88, 0.9);
          this.snapHighlight.fillStyle(0x00ff88, 0.15);
          this.snapHighlight.fillRect(
            GRID_X + snapCol * CELL, GRID_Y + snapRow * CELL, CELL, CELL,
          );
          this.snapHighlight.strokeRect(
            GRID_X + snapCol * CELL, GRID_Y + snapRow * CELL, CELL, CELL,
          );
        }
      });

      zone.on('dragend', (ptr: Phaser.Input.Pointer) => {
        const px = ptr.x;
        const py = ptr.y;
        this.dragGhost.setVisible(false);
        this.dragGhostLabel.setVisible(false);
        this.snapHighlight.clear();

        if (this.buildMode && this.draggingType) {
          if (px >= GRID_X && px < GRID_X + GRID_COLS * CELL &&
              py >= GRID_Y && py < GRID_Y + GRID_ROWS * CELL) {
            const snapCol = Math.floor((px - GRID_X) / CELL);
            const snapRow = Math.floor((py - GRID_Y) / CELL);
            this.placePiece(this.draggingType, snapCol, snapRow);
          }
        }
        this.draggingType = null;
      });
    });
  }

  private createDragSystem(): void {
    this.dragGhost = this.add.graphics();
    this.dragGhost.setDepth(50).setAlpha(0.75).setVisible(false);

    this.dragGhostLabel = this.add.text(0, 0, '', {
      fontSize: '9px', color: '#ffffff',
      backgroundColor: '#000000aa', padding: { x: 3, y: 2 },
    }).setOrigin(0.5).setDepth(51).setVisible(false);
  }

  private createControls(): void {
    // Large Drop Marble button
    const dropBtn = this.add.text(GAME_WIDTH - 8, 28, '🔮 Drop Marble', {
      fontSize: '15px',
      color: '#ffffff',
      backgroundColor: '#1a7a2a',
      padding: { x: 10, y: 6 },
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(102).setInteractive({ useHandCursor: true });

    dropBtn.on('pointerover', () => { dropBtn.setStyle({ backgroundColor: '#22aa33' }); });
    dropBtn.on('pointerout', () => { dropBtn.setStyle({ backgroundColor: '#1a7a2a' }); });
    dropBtn.on('pointerdown', () => {
      dropBtn.setStyle({ backgroundColor: '#0f4d18' });
      this.dropMarble();
    });
    dropBtn.on('pointerup', () => { dropBtn.setStyle({ backgroundColor: '#1a7a2a' }); });

    // Build / Remove mode toggle
    this.modeBtnText = this.add.text(PALETTE_W / 2, 800, '✏️ Build', {
      fontSize: '12px', color: '#2ecc71',
      backgroundColor: '#162040', padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });

    this.modeBtnText.on('pointerdown', () => {
      this.buildMode = !this.buildMode;
      this.modeBtnText.setText(this.buildMode ? '✏️ Build' : '🗑️ Remove');
      this.modeBtnText.setColor(this.buildMode ? '#2ecc71' : '#e74c3c');
    });

    // Remove mode click handler on grid
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.buildMode && !this.draggingType) {
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
    CharacterRenderer.create(this, GAME_WIDTH - 80, GAME_HEIGHT - 72, state.dadConfig, 1).setDepth(4);
    CharacterRenderer.create(this, GAME_WIDTH - 40, GAME_HEIGHT - 64, state.lillianConfig, 0.9).setDepth(4);
  }

  private createTutorialOverlay(): void {
    this.tutorialOverlay = this.add.container(0, 0).setDepth(200);

    const dimBg = this.add.graphics();
    dimBg.fillStyle(0x000000, 0.7);
    dimBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.tutorialOverlay.add(dimBg);

    const box = this.add.graphics();
    box.fillStyle(0x1a2744, 1);
    box.fillRoundedRect(40, GAME_HEIGHT / 2 - 100, GAME_WIDTH - 80, 200, 16);
    box.lineStyle(3, 0xffd700, 1);
    box.strokeRoundedRect(40, GAME_HEIGHT / 2 - 100, GAME_WIDTH - 80, 200, 16);
    this.tutorialOverlay.add(box);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '🎱 Marble Run!', {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tutorialOverlay.add(title);

    const msg = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30,
      'Drag pieces from the left panel\nto build your marble run!\n\nThen tap  🔮 Drop Marble\nto send a marble through!',
      { fontSize: '15px', color: '#ecf0f1', align: 'center', lineSpacing: 4 },
    ).setOrigin(0.5);
    this.tutorialOverlay.add(msg);

    const tapMsg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'Tap anywhere to start!', {
      fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.tutorialOverlay.add(tapMsg);

    const dismissZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive();
    dismissZone.once('pointerdown', () => {
      this.tutorialOverlay.setVisible(false);
      dismissZone.destroy();
    });
    this.tutorialOverlay.add(dismissZone);
  }

  private placeSampleRun(): void {
    this.placePiece('funnel',     3, 0);
    this.placePiece('straight_v', 3, 1);
    this.placePiece('curve_se',   3, 2);
    this.placePiece('straight_h', 4, 2);
    this.placePiece('curve_sw',   5, 2);
    this.placePiece('straight_v', 5, 3);
    this.placePiece('curve_se',   5, 4);
    this.placePiece('straight_h', 6, 4);
  }

  private dropMarble(): void {
    if (this.marbles.length >= MAX_MARBLES) { return; }

    let startCol = -1;
    let startRow = -1;

    outer: for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const piece = this.grid[r][c];
        if (piece && PIECE_SOCKETS[piece.type].includes('N')) {
          startCol = c;
          startRow = r;
          break outer;
        }
      }
    }

    const gfx = this.add.graphics();
    gfx.setDepth(15);

    if (startCol === -1) {
      const px = GRID_X + Math.floor(GRID_COLS / 2) * CELL + CELL / 2;
      const py = GRID_Y;
      const marble: MarbleState = {
        col: -1, row: -1, entrySocket: 'N', t: 0,
        freefall: true, px, py, pvx: 0, pvy: 0,
        gfx, active: true,
      };
      this.marbles.push(marble);
      this.addScore(1);
      return;
    }

    const cx = GRID_X + startCol * CELL + CELL / 2;
    const cy = GRID_Y + startRow * CELL;
    const marble: MarbleState = {
      col: startCol, row: startRow, entrySocket: 'N', t: 0,
      freefall: false, px: cx, py: cy, pvx: 0, pvy: 0,
      gfx, active: true,
    };
    this.marbles.push(marble);
    this.addScore(1);
  }

  private updateMarble(marble: MarbleState, dt: number): void {
    if (marble.freefall) {
      this.updateFreefallMarble(marble, dt);
    } else {
      this.updatePieceMarble(marble, dt);
    }
    this.drawMarble(marble);
  }

  private updateFreefallMarble(marble: MarbleState, dt: number): void {
    const gravity = 400;
    marble.pvy += gravity * dt;
    marble.px += marble.pvx * dt;
    marble.py += marble.pvy * dt;

    if (marble.px < GRID_X + 8) { marble.px = GRID_X + 8; marble.pvx = Math.abs(marble.pvx) * 0.6; }
    if (marble.px > GRID_X + GRID_COLS * CELL - 8) {
      marble.px = GRID_X + GRID_COLS * CELL - 8;
      marble.pvx = -Math.abs(marble.pvx) * 0.6;
    }

    const col = Math.floor((marble.px - GRID_X) / CELL);
    const row = Math.floor((marble.py - GRID_Y) / CELL);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const piece = this.grid[row]?.[col];
      if (piece && PIECE_SOCKETS[piece.type].includes('N')) {
        marble.col = col;
        marble.row = row;
        marble.entrySocket = 'N';
        marble.t = 0;
        marble.freefall = false;
        marble.pvx = 0;
        marble.pvy = 0;
        return;
      }
    }

    if (marble.py > GRID_Y + GRID_ROWS * CELL + 40) {
      marble.active = false;
    }
  }

  private updatePieceMarble(marble: MarbleState, dt: number): void {
    const piece = this.grid[marble.row]?.[marble.col];
    if (!piece) {
      marble.freefall = true;
      marble.pvy = 0;
      marble.pvx = 0;
      return;
    }

    let exitSock: Socket | undefined = EXIT_SOCKET[piece.type][marble.entrySocket];

    // Splitter alternates exit direction on first entry (t === 0)
    if (piece.type === 'splitter' && marble.entrySocket === 'N' && marble.t === 0) {
      exitSock = piece.splitterFlip ? 'W' : 'E';
      piece.splitterFlip = !piece.splitterFlip;
    }

    if (!exitSock) {
      marble.freefall = true;
      marble.pvy = 50;
      return;
    }

    const cx = GRID_X + marble.col * CELL + CELL / 2;
    const cy = GRID_Y + marble.row * CELL + CELL / 2;
    const entryOff = socketOffset(marble.entrySocket, CELL);
    const exitOff = socketOffset(exitSock, CELL);
    const entryX = cx + entryOff.ox;
    const entryY = cy + entryOff.oy;
    const exitX = cx + exitOff.ox;
    const exitY = cy + exitOff.oy;

    const dist = Math.sqrt((exitX - entryX) ** 2 + (exitY - entryY) ** 2);
    const travelTime = dist / MARBLE_SPEED;

    marble.t += dt / (travelTime > 0.001 ? travelTime : 0.001);

    if (marble.t >= 1) {
      marble.t = 1;
      marble.px = exitX;
      marble.py = exitY;

      const { dc, dr } = socketDelta(exitSock);
      const nextCol = marble.col + dc;
      const nextRow = marble.row + dr;

      if (nextCol >= 0 && nextCol < GRID_COLS && nextRow >= 0 && nextRow < GRID_ROWS) {
        const nextPiece = this.grid[nextRow]?.[nextCol];
        const nextEntry = opposite(exitSock);
        if (nextPiece && PIECE_SOCKETS[nextPiece.type].includes(nextEntry)) {
          marble.col = nextCol;
          marble.row = nextRow;
          marble.entrySocket = nextEntry;
          marble.t = 0;
          return;
        }
      }

      marble.freefall = true;
      marble.pvx = exitSock === 'E' ? 60 : exitSock === 'W' ? -60 : 0;
      marble.pvy = exitSock === 'S' || exitSock === 'N' ? 20 : 0;
      return;
    }

    if (piece.type.startsWith('curve')) {
      const angle = Math.atan2(entryY - cy, entryX - cx);
      const exitAngle = Math.atan2(exitY - cy, exitX - cx);
      const r = Math.sqrt((entryX - cx) ** 2 + (entryY - cy) ** 2);
      let da = exitAngle - angle;
      while (da > Math.PI) { da -= 2 * Math.PI; }
      while (da < -Math.PI) { da += 2 * Math.PI; }
      const a = angle + da * marble.t;
      marble.px = cx + Math.cos(a) * r;
      marble.py = cy + Math.sin(a) * r;
    } else {
      marble.px = entryX + (exitX - entryX) * marble.t;
      marble.py = entryY + (exitY - entryY) * marble.t;
    }
  }

  private drawMarble(marble: MarbleState): void {
    const x = marble.px;
    const y = marble.py;
    const r = 8;

    marble.gfx.clear();
    marble.gfx.fillStyle(0x000000, 0.18);
    marble.gfx.fillEllipse(x + 2, y + 4, r * 2.2, r * 0.9);
    marble.gfx.fillStyle(0x2980b9);
    marble.gfx.fillCircle(x, y, r);
    marble.gfx.lineStyle(1.5, 0x85c1e9, 0.6);
    marble.gfx.strokeCircle(x, y, r - 2);
    marble.gfx.fillStyle(0xffffff, 0.7);
    marble.gfx.fillCircle(x - 3, y - 3, 3);
    marble.gfx.fillStyle(0xffffff, 0.35);
    marble.gfx.fillCircle(x - 2, y - 2, 1.5);
  }
}
