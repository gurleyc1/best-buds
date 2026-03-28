import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.PRELOAD }); }

  preload(): void {
    // Loading bar
    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.BG_DARK);
    barBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Best Buds', {
      fontSize: '42px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 6,
    }).setOrigin(0.5);

    const barW = GAME_WIDTH * 0.7;
    const barH = 24;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const barY = GAME_HEIGHT / 2 - barH / 2;

    const barOutline = this.add.graphics();
    barOutline.lineStyle(2, COLORS.WHITE, 1);
    barOutline.strokeRect(barX, barY, barW, barH);

    const barFill = this.add.graphics();
    const loadText = this.add.text(GAME_WIDTH / 2, barY + barH + 16, 'Loading...', {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(COLORS.YELLOW);
      barFill.fillRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4);
      loadText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });
  }

  create(): void {
    this.generateTextures();
    this.scene.start(SCENE_KEYS.MAIN_MENU);
  }

  private generateTextures(): void {
    this.generateBalloon();
    this.generateTennisBall();
    this.generateSoccerBall();
    this.generateCar();
    this.generateBicycle();
    this.generateMarble();
    this.generatePieceStraightH();
    this.generatePieceStraightV();
    this.generatePieceCurveBL();
    this.generatePieceCurveBR();
    this.generatePieceCurveTL();
    this.generatePieceCurveTR();
    this.generatePieceFunnel();
    this.generatePieceSpiral();
    this.generatePieceSplitter();
    this.generateTileGrass();
    this.generateTileRoad();
    this.generateTileSidewalk();
    this.generateTree();
    this.generateHouse();
    this.generateTennisCourt();
    this.generateSoccerGoal();
    this.generateRacket();
    this.generateWindParticle();
  }

  private generateBalloon(): void {
    const g = this.make.graphics({}, false);
    // Balloon body
    g.fillStyle(0xff69b4);
    g.fillEllipse(16, 14, 22, 26);
    // Highlight
    g.fillStyle(0xffb3d1, 0.7);
    g.fillEllipse(10, 8, 8, 10);
    // Knot at bottom
    g.fillStyle(0xff1493);
    g.fillTriangle(14, 26, 18, 26, 16, 30);
    // String
    g.lineStyle(1, 0x888888, 1);
    g.lineBetween(16, 30, 16, 40);
    g.generateTexture('balloon', 32, 42);
    g.destroy();
  }

  private generateTennisBall(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xc8e600);
    g.fillCircle(12, 12, 11);
    // Curved lines
    g.lineStyle(2, 0x888800, 0.8);
    g.beginPath();
    g.arc(5, 12, 8, -0.4, 0.4);
    g.strokePath();
    g.beginPath();
    g.arc(19, 12, 8, Math.PI - 0.4, Math.PI + 0.4);
    g.strokePath();
    g.generateTexture('tennis_ball', 24, 24);
    g.destroy();
  }

  private generateSoccerBall(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff);
    g.fillCircle(16, 16, 14);
    // Pentagon patches
    g.fillStyle(0x222222);
    g.fillPentagonApprox(16, 16, 5);
    g.fillPentagonApprox(16, 5, 3.5);
    g.fillPentagonApprox(25, 22, 3.5);
    g.fillPentagonApprox(7, 22, 3.5);
    g.fillPentagonApprox(24, 9, 3.5);
    g.fillPentagonApprox(8, 9, 3.5);
    g.generateTexture('soccer_ball', 32, 32);
    g.destroy();
  }

  private generateCar(): void {
    const g = this.make.graphics({}, false);
    // Car body
    g.fillStyle(0xe74c3c);
    g.fillRoundedRect(4, 8, 40, 20, 4);
    // Windshields
    g.fillStyle(0x85c1e9, 0.8);
    g.fillRect(10, 10, 14, 8);
    g.fillRect(26, 10, 14, 8);
    // Wheels
    g.fillStyle(0x2c3e50);
    g.fillCircle(10, 28, 5);
    g.fillCircle(38, 28, 5);
    // Wheel highlight
    g.fillStyle(0x666666);
    g.fillCircle(10, 28, 2);
    g.fillCircle(38, 28, 2);
    g.generateTexture('car', 48, 36);
    g.destroy();
  }

  private generateBicycle(): void {
    const g = this.make.graphics({}, false);
    // Wheels
    g.lineStyle(2, 0x2c3e50, 1);
    g.strokeCircle(10, 22, 9);
    g.strokeCircle(38, 22, 9);
    // Frame
    g.lineStyle(2, 0xe74c3c, 1);
    g.lineBetween(10, 22, 22, 10);
    g.lineBetween(22, 10, 38, 22);
    g.lineBetween(10, 22, 24, 22);
    g.lineBetween(22, 10, 24, 22);
    // Seat
    g.fillStyle(0x2c3e50);
    g.fillRect(18, 8, 10, 3);
    // Handle bars
    g.lineStyle(2, 0x2c3e50, 1);
    g.lineBetween(33, 22, 36, 12);
    g.lineBetween(33, 12, 39, 12);
    g.generateTexture('bicycle', 50, 34);
    g.destroy();
  }

  private generateMarble(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x3498db);
    g.fillCircle(8, 8, 7);
    // Highlight
    g.fillStyle(0x85c1e9, 0.8);
    g.fillCircle(5, 5, 3);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(4, 4, 1.5);
    g.generateTexture('marble', 16, 16);
    g.destroy();
  }

  private generatePieceStraightH(): void {
    const g = this.make.graphics({}, false);
    // Tube walls
    g.fillStyle(0x2980b9);
    g.fillRect(0, 6, 48, 20);
    // Inner channel
    g.fillStyle(0x1a5276);
    g.fillRect(0, 10, 48, 12);
    // Highlights
    g.fillStyle(0x5dade2, 0.5);
    g.fillRect(0, 6, 48, 4);
    g.generateTexture('piece_straight_h', 48, 32);
    g.destroy();
  }

  private generatePieceStraightV(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2980b9);
    g.fillRect(6, 0, 20, 48);
    g.fillStyle(0x1a5276);
    g.fillRect(10, 0, 12, 48);
    g.fillStyle(0x5dade2, 0.5);
    g.fillRect(6, 0, 4, 48);
    g.generateTexture('piece_straight_v', 32, 48);
    g.destroy();
  }

  private generatePieceCurveBL(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2980b9);
    g.beginPath();
    g.arc(32, 0, 26, Math.PI * 0.5, Math.PI, false);
    g.arc(32, 0, 6, Math.PI, Math.PI * 0.5, true);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x1a5276);
    g.beginPath();
    g.arc(32, 0, 22, Math.PI * 0.5, Math.PI, false);
    g.arc(32, 0, 10, Math.PI, Math.PI * 0.5, true);
    g.closePath();
    g.fillPath();
    g.generateTexture('piece_curve_bl', 32, 32);
    g.destroy();
  }

  private generatePieceCurveBR(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2980b9);
    g.beginPath();
    g.arc(0, 0, 26, 0, Math.PI * 0.5, false);
    g.arc(0, 0, 6, Math.PI * 0.5, 0, true);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x1a5276);
    g.beginPath();
    g.arc(0, 0, 22, 0, Math.PI * 0.5, false);
    g.arc(0, 0, 10, Math.PI * 0.5, 0, true);
    g.closePath();
    g.fillPath();
    g.generateTexture('piece_curve_br', 32, 32);
    g.destroy();
  }

  private generatePieceCurveTL(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2980b9);
    g.beginPath();
    g.arc(32, 32, 26, Math.PI, Math.PI * 1.5, false);
    g.arc(32, 32, 6, Math.PI * 1.5, Math.PI, true);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x1a5276);
    g.beginPath();
    g.arc(32, 32, 22, Math.PI, Math.PI * 1.5, false);
    g.arc(32, 32, 10, Math.PI * 1.5, Math.PI, true);
    g.closePath();
    g.fillPath();
    g.generateTexture('piece_curve_tl', 32, 32);
    g.destroy();
  }

  private generatePieceCurveTR(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2980b9);
    g.beginPath();
    g.arc(0, 32, 26, Math.PI * 1.5, 0, false);
    g.arc(0, 32, 6, 0, Math.PI * 1.5, true);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x1a5276);
    g.beginPath();
    g.arc(0, 32, 22, Math.PI * 1.5, 0, false);
    g.arc(0, 32, 10, 0, Math.PI * 1.5, true);
    g.closePath();
    g.fillPath();
    g.generateTexture('piece_curve_tr', 32, 32);
    g.destroy();
  }

  private generatePieceFunnel(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xe67e22);
    // Wide top
    g.fillTriangle(0, 0, 48, 0, 28, 48);
    g.fillTriangle(0, 0, 20, 48, 0, 0);
    // Narrow bottom tube
    g.fillRect(20, 36, 8, 12);
    // Highlight
    g.fillStyle(0xf39c12, 0.6);
    g.fillTriangle(6, 4, 24, 4, 8, 20);
    g.generateTexture('piece_funnel', 48, 48);
    g.destroy();
  }

  private generatePieceSpiral(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x9b59b6);
    g.fillRect(10, 0, 8, 48);
    g.fillRect(30, 0, 8, 48);
    // Spiral cross-bars
    g.fillStyle(0x8e44ad);
    for (let i = 0; i < 4; i++) {
      const y = i * 12 + 4;
      g.fillRect(10, y, 28, 5);
    }
    g.fillStyle(0xc39bd3, 0.5);
    g.fillRect(10, 0, 5, 48);
    g.generateTexture('piece_spiral', 48, 48);
    g.destroy();
  }

  private generatePieceSplitter(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2ecc71);
    // Vertical top
    g.fillRect(20, 0, 8, 24);
    // Left branch
    g.fillRect(0, 24, 22, 8);
    // Right branch
    g.fillRect(26, 24, 22, 8);
    // Junction
    g.fillStyle(0x27ae60);
    g.fillTriangle(20, 20, 28, 20, 24, 32);
    g.generateTexture('piece_splitter', 48, 42);
    g.destroy();
  }

  private generateTileGrass(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x4caf50);
    g.fillRect(0, 0, 32, 32);
    // Subtle grid
    g.lineStyle(1, 0x43a047, 0.4);
    g.lineBetween(0, 0, 32, 0);
    g.lineBetween(0, 0, 0, 32);
    // Grass tufts
    g.fillStyle(0x388e3c, 0.5);
    g.fillRect(4, 8, 3, 5);
    g.fillRect(16, 4, 3, 6);
    g.fillRect(24, 18, 3, 5);
    g.generateTexture('tile_grass', 32, 32);
    g.destroy();
  }

  private generateTileRoad(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x607d8b);
    g.fillRect(0, 0, 32, 32);
    // Center stripe
    g.fillStyle(0xffd700, 0.6);
    g.fillRect(14, 0, 4, 32);
    g.generateTexture('tile_road', 32, 32);
    g.destroy();
  }

  private generateTileSidewalk(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xbcaaa4);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0xd7ccc8, 0.8);
    g.lineBetween(16, 0, 16, 32);
    g.lineBetween(0, 16, 32, 16);
    g.generateTexture('tile_sidewalk', 32, 32);
    g.destroy();
  }

  private generateTree(): void {
    const g = this.make.graphics({}, false);
    // Trunk
    g.fillStyle(0x795548);
    g.fillRect(12, 22, 8, 14);
    // Canopy
    g.fillStyle(0x4caf50);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0x388e3c);
    g.fillCircle(10, 19, 9);
    g.fillCircle(22, 19, 9);
    // Highlight
    g.fillStyle(0x66bb6a, 0.5);
    g.fillCircle(12, 10, 6);
    g.generateTexture('tree', 32, 36);
    g.destroy();
  }

  private generateHouse(): void {
    const g = this.make.graphics({}, false);
    // Walls
    g.fillStyle(0xf5deb3);
    g.fillRect(4, 28, 64, 36);
    // Roof
    g.fillStyle(0xc0392b);
    g.fillTriangle(0, 30, 72, 30, 36, 4);
    // Door
    g.fillStyle(0x8b4513);
    g.fillRect(27, 44, 18, 20);
    // Door knob
    g.fillStyle(0xffd700);
    g.fillCircle(41, 54, 2);
    // Windows
    g.fillStyle(0x85c1e9);
    g.fillRect(10, 36, 14, 12);
    g.fillRect(48, 36, 14, 12);
    g.lineStyle(1, 0xffffff, 0.7);
    g.lineBetween(17, 36, 17, 48);
    g.lineBetween(10, 42, 24, 42);
    g.lineBetween(55, 36, 55, 48);
    g.lineBetween(48, 42, 62, 42);
    g.generateTexture('house', 72, 64);
    g.destroy();
  }

  private generateTennisCourt(): void {
    const g = this.make.graphics({}, false);
    // Court surface
    g.fillStyle(0x2e7d32);
    g.fillRect(0, 0, 240, 160);
    // Outer boundary
    g.lineStyle(3, 0xffffff, 1);
    g.strokeRect(8, 8, 224, 144);
    // Center line
    g.lineBetween(120, 8, 120, 152);
    // Service lines
    g.lineBetween(8, 54, 232, 54);
    g.lineBetween(8, 106, 232, 106);
    // Net
    g.lineStyle(4, 0xffffff, 0.9);
    g.lineBetween(120, 8, 120, 152);
    g.fillStyle(0xffffff);
    g.fillRect(116, 72, 8, 16);
    g.generateTexture('tennis_court', 240, 160);
    g.destroy();
  }

  private generateSoccerGoal(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff);
    // Posts
    g.fillRect(2, 2, 6, 36);
    g.fillRect(72, 2, 6, 36);
    // Crossbar
    g.fillRect(2, 2, 76, 6);
    // Net
    g.lineStyle(1, 0xcccccc, 0.7);
    for (let x = 8; x < 72; x += 8) g.lineBetween(x, 8, x, 38);
    for (let y = 8; y < 38; y += 6) g.lineBetween(8, y, 72, y);
    g.generateTexture('soccer_goal', 80, 40);
    g.destroy();
  }

  private generateRacket(): void {
    const g = this.make.graphics({}, false);
    // Handle
    g.fillStyle(0x8b4513);
    g.fillRect(6, 22, 4, 18);
    // Head oval
    g.lineStyle(2, 0x8b4513, 1);
    g.strokeEllipse(8, 14, 14, 20);
    // Strings
    g.lineStyle(1, 0xcccccc, 0.8);
    for (let y = 6; y <= 22; y += 4) g.lineBetween(2, y, 14, y);
    for (let x = 3; x <= 13; x += 3) g.lineBetween(x, 5, x, 23);
    g.generateTexture('racket', 16, 40);
    g.destroy();
  }

  private generateWindParticle(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(4, 4, 8, 4);
    g.generateTexture('wind_particle', 8, 8);
    g.destroy();
  }
}

// Extend Phaser Graphics with a helper for pentagon approximation
declare module 'phaser' {
  namespace GameObjects {
    interface Graphics {
      fillPentagonApprox(cx: number, cy: number, r: number): void;
    }
  }
}

Phaser.GameObjects.Graphics.prototype.fillPentagonApprox = function(
  cx: number, cy: number, r: number
): void {
  const pts: number[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    pts.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  this.fillPoints([
    { x: pts[0], y: pts[1] },
    { x: pts[2], y: pts[3] },
    { x: pts[4], y: pts[5] },
    { x: pts[6], y: pts[7] },
    { x: pts[8], y: pts[9] },
  ], true);
};
