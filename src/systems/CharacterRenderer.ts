import Phaser from 'phaser';
import { CharacterConfig } from '../types';

export class CharacterRenderer {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: CharacterConfig,
    scale = 1
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const g = scene.add.graphics();

    const isDad = config.id === 'dad';

    // Base proportions (at scale=1, hub size ~32px tall)
    const headR = isDad ? 7 * scale : 6 * scale;
    const bodyW = isDad ? 10 * scale : 8 * scale;
    const bodyH = isDad ? 14 * scale : 11 * scale;
    const legH = isDad ? 10 * scale : 8 * scale;
    const legW = isDad ? 4 * scale : 3 * scale;
    const shoeH = isDad ? 4 * scale : 3 * scale;
    const shoeW = isDad ? 5 * scale : 4 * scale;
    const neckH = isDad ? 3 * scale : 2 * scale;
    const neckW = isDad ? 4 * scale : 3 * scale;

    // Anchor: feet at y=0, body builds upward
    const feetY = 0;
    const legTopY = feetY - legH;
    const bodyBottomY = legTopY;
    const bodyTopY = bodyBottomY - bodyH;
    const neckBottomY = bodyTopY;
    const neckTopY = neckBottomY - neckH;
    const headCY = neckTopY - headR;

    // Shoes
    g.fillStyle(config.shoeColor);
    g.fillEllipse(-legW * 0.6 - shoeW * 0.3, feetY - shoeH * 0.4, shoeW * 2, shoeH);
    g.fillEllipse(legW * 0.6 + shoeW * 0.3, feetY - shoeH * 0.4, shoeW * 2, shoeH);

    // Legs / pants
    g.fillStyle(config.bottomColor);
    g.fillRect(-legW * 1.1 - legW * 0.1, legTopY, legW, legH);
    g.fillRect(legW * 0.1, legTopY, legW, legH);

    // Waistband slightly darker
    const waistH = 2 * scale;
    g.fillStyle(blendDarker(config.bottomColor, 0.15));
    g.fillRect(-bodyW / 2, bodyBottomY - waistH, bodyW, waistH);

    // Body / shirt
    g.fillStyle(config.topColor);
    g.fillRect(-bodyW / 2, bodyTopY, bodyW, bodyH);

    // Shirt collar details
    g.fillStyle(blendLighter(config.topColor, 0.2));
    g.fillTriangle(
      0, bodyTopY,
      -bodyW * 0.3, bodyTopY + bodyH * 0.2,
      bodyW * 0.3, bodyTopY + bodyH * 0.2
    );

    // Hands / arms (skin)
    g.fillStyle(config.skinTone);
    const armY = bodyTopY + bodyH * 0.3;
    const armW = isDad ? 3 * scale : 2 * scale;
    const armH = isDad ? 8 * scale : 6 * scale;
    g.fillRect(-bodyW / 2 - armW, armY, armW, armH);
    g.fillRect(bodyW / 2, armY, armW, armH);
    g.fillCircle(-bodyW / 2 - armW / 2, armY + armH, armW * 0.8);
    g.fillCircle(bodyW / 2 + armW / 2, armY + armH, armW * 0.8);

    // Neck
    g.fillStyle(config.skinTone);
    g.fillRect(-neckW / 2, neckBottomY - neckH, neckW, neckH);

    // Head
    g.fillStyle(config.skinTone);
    g.fillCircle(0, headCY, headR);

    // Eyes
    const eyeY = headCY - headR * 0.1;
    const eyeSpacing = headR * 0.45;
    const eyeR = Math.max(1, headR * 0.18);
    g.fillStyle(0x1a1a2e);
    g.fillCircle(-eyeSpacing, eyeY, eyeR);
    g.fillCircle(eyeSpacing, eyeY, eyeR);
    // Eye glint
    g.fillStyle(0xffffff);
    g.fillCircle(-eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, Math.max(1, eyeR * 0.4));
    g.fillCircle(eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, Math.max(1, eyeR * 0.4));

    // Smile
    g.lineStyle(Math.max(1, scale * 0.8), 0x1a1a2e, 1);
    const smileY = headCY + headR * 0.3;
    g.beginPath();
    g.arc(0, smileY - headR * 0.1, headR * 0.35, 0.2, Math.PI - 0.2);
    g.strokePath();

    // Cheeks
    g.fillStyle(0xffb3b3, 0.5);
    g.fillCircle(-eyeSpacing * 0.9, eyeY + eyeR * 2, headR * 0.2);
    g.fillCircle(eyeSpacing * 0.9, eyeY + eyeR * 2, headR * 0.2);

    // Hair
    drawHair(g, config.hairStyle, config.hairColor, headCY, headR, scale, isDad);

    // Accessory
    drawAccessory(g, config.accessory, headCY, headR, scale, config.hairColor);

    container.add(g);
    return container;
  }
}

function blendDarker(color: number, amount: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * (1 - amount));
  const gv = Math.floor(((color >> 8) & 0xff) * (1 - amount));
  const b = Math.floor((color & 0xff) * (1 - amount));
  return (r << 16) | (gv << 8) | b;
}

function blendLighter(color: number, amount: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) + 255 * amount));
  const gv = Math.min(255, Math.floor(((color >> 8) & 0xff) + 255 * amount));
  const b = Math.min(255, Math.floor((color & 0xff) + 255 * amount));
  return (r << 16) | (gv << 8) | b;
}

// Helper: fill a semicircle (bottom half or top half)
function fillSemicircle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, topHalf: boolean): void {
  g.beginPath();
  if (topHalf) {
    g.arc(cx, cy, r, Math.PI, 0, false);
  } else {
    g.arc(cx, cy, r, 0, Math.PI, false);
  }
  g.closePath();
  g.fillPath();
}

// Helper: fill a full arc "cap" (top half = hair cap)
function fillHairCap(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  fillSemicircle(g, cx, cy, r, true);
}

function drawHair(
  g: Phaser.GameObjects.Graphics,
  style: string,
  color: number,
  headCY: number,
  headR: number,
  scale: number,
  _isDad: boolean
): void {
  g.fillStyle(color);
  g.lineStyle(Math.max(1, scale * 0.8), color, 1);

  switch (style) {
    case 'short_messy': {
      fillHairCap(g, 0, headCY, headR * 1.05);
      // Spikes
      for (let i = -2; i <= 2; i++) {
        const bx = (i / 2.5) * headR;
        const by = headCY - headR + scale * 2;
        g.fillTriangle(
          bx - headR * 0.15, by,
          bx + headR * 0.15, by,
          bx + (i % 2 === 0 ? headR * 0.1 : -headR * 0.1), by - headR * 0.4
        );
      }
      break;
    }
    case 'short_neat': {
      fillHairCap(g, 0, headCY, headR * 1.05);
      g.fillRect(-headR * 1.05, headCY - 2 * scale, headR * 0.5, headR * 0.6);
      g.fillRect(headR * 0.55, headCY - 2 * scale, headR * 0.5, headR * 0.6);
      break;
    }
    case 'medium_wavy': {
      fillHairCap(g, 0, headCY, headR * 1.05);
      for (let i = 0; i < 3; i++) {
        const wy = headCY + i * headR * 0.6;
        const wx = -headR - (i % 2 === 0 ? headR * 0.3 : 0);
        g.fillEllipse(wx, wy, headR * 0.7, headR * 0.7 + scale);
      }
      for (let i = 0; i < 3; i++) {
        const wy = headCY + i * headR * 0.6;
        const wx = headR + (i % 2 === 0 ? headR * 0.3 : 0);
        g.fillEllipse(wx, wy, headR * 0.7, headR * 0.7 + scale);
      }
      break;
    }
    case 'long_straight': {
      fillHairCap(g, 0, headCY, headR * 1.05);
      const sideW = headR * 0.65;
      const longLen = headR * 3;
      g.fillRect(-headR - sideW * 0.5, headCY, sideW, longLen);
      g.fillRect(headR - sideW * 0.5, headCY, sideW, longLen);
      g.fillEllipse(-headR - sideW * 0.1, headCY + longLen, sideW, headR * 0.5);
      g.fillEllipse(headR + sideW * 0.1, headCY + longLen, sideW, headR * 0.5);
      break;
    }
    case 'long_braids': {
      fillHairCap(g, 0, headCY, headR * 1.05);
      const braidW = headR * 0.55;
      const segH = headR * 0.55;
      const numSegs = 5;
      for (let s = 0; s < numSegs; s++) {
        const yy = headCY + s * segH * 0.9;
        const narrowing = s * 0.04;
        g.fillEllipse(-headR * 0.95, yy + segH / 2, braidW * (1 - narrowing), segH * 0.85);
        g.fillEllipse(headR * 0.95, yy + segH / 2, braidW * (1 - narrowing), segH * 0.85);
        if (s < numSegs - 1) {
          g.lineStyle(Math.max(1, scale * 0.6), blendDarker(color, 0.3), 1);
          g.lineBetween(
            -headR * 0.95 - braidW * 0.4, yy + segH * 0.85,
            -headR * 0.95 + braidW * 0.4, yy + segH * 0.85
          );
          g.lineBetween(
            headR * 0.95 - braidW * 0.4, yy + segH * 0.85,
            headR * 0.95 + braidW * 0.4, yy + segH * 0.85
          );
          g.lineStyle(Math.max(1, scale * 0.8), color, 1);
        }
      }
      g.fillStyle(0xff69b4);
      g.fillCircle(-headR * 0.95, headCY + numSegs * segH * 0.9, headR * 0.25);
      g.fillCircle(headR * 0.95, headCY + numSegs * segH * 0.9, headR * 0.25);
      break;
    }
    case 'ponytail': {
      fillHairCap(g, 0, headCY, headR * 1.05);
      g.fillEllipse(headR * 0.5, headCY - headR * 1.5, headR * 0.6, headR * 1.8);
      g.fillStyle(0xff69b4);
      g.fillRect(headR * 0.2, headCY - headR * 0.85, headR * 0.6, headR * 0.25);
      break;
    }
    case 'buns': {
      fillHairCap(g, 0, headCY, headR * 0.95);
      g.fillCircle(-headR * 0.55, headCY - headR * 0.9, headR * 0.55);
      g.fillCircle(headR * 0.55, headCY - headR * 0.9, headR * 0.55);
      g.fillStyle(blendLighter(color, 0.25));
      g.fillCircle(-headR * 0.65, headCY - headR * 1.05, headR * 0.2);
      g.fillCircle(headR * 0.45, headCY - headR * 1.05, headR * 0.2);
      break;
    }
    case 'curly_short': {
      fillHairCap(g, 0, headCY, headR * 0.95);
      const numCurls = 8;
      for (let i = 0; i < numCurls; i++) {
        const angle = (i / numCurls) * Math.PI + Math.PI / numCurls;
        const cx = Math.cos(angle) * headR;
        const cy = headCY + Math.sin(angle) * headR;
        g.fillCircle(cx, cy, headR * 0.35);
      }
      break;
    }
    case 'curly_long': {
      fillHairCap(g, 0, headCY, headR * 0.95);
      const numCurls = 8;
      for (let i = 0; i < numCurls; i++) {
        const angle = (i / numCurls) * Math.PI + Math.PI / numCurls;
        const cx = Math.cos(angle) * headR;
        const cy = headCY + Math.sin(angle) * headR;
        g.fillCircle(cx, cy, headR * 0.35);
      }
      for (let i = 0; i < 4; i++) {
        const cy2 = headCY + headR * 0.6 + i * headR * 0.65;
        g.fillCircle(-headR - headR * 0.2, cy2, headR * 0.38);
        g.fillCircle(headR + headR * 0.2, cy2, headR * 0.38);
      }
      break;
    }
    case 'pixie': {
      fillHairCap(g, 0, headCY, headR * 1.0);
      g.fillRect(-headR * 0.8, headCY - headR * 0.15, headR * 1.6, headR * 0.35);
      break;
    }
    default: {
      fillHairCap(g, 0, headCY, headR * 1.05);
    }
  }
}

function drawAccessory(
  g: Phaser.GameObjects.Graphics,
  accessory: string,
  headCY: number,
  headR: number,
  scale: number,
  _hairColor: number
): void {
  switch (accessory) {
    case 'none':
      break;
    case 'glasses_round': {
      const gy = headCY - headR * 0.1;
      const gx = headR * 0.42;
      const gr = headR * 0.3;
      g.lineStyle(Math.max(1.5, scale), 0x2c3e50, 1);
      g.strokeCircle(-gx, gy, gr);
      g.strokeCircle(gx, gy, gr);
      g.lineBetween(-gx + gr, gy, gx - gr, gy);
      break;
    }
    case 'glasses_square': {
      const gy = headCY - headR * 0.12;
      const gw = headR * 0.55;
      const gh = headR * 0.42;
      g.lineStyle(Math.max(1.5, scale), 0x2c3e50, 1);
      g.strokeRect(-headR * 0.72, gy - gh / 2, gw, gh);
      g.strokeRect(headR * 0.17, gy - gh / 2, gw, gh);
      g.lineBetween(headR * 0.17, gy, -headR * 0.72 + gw, gy);
      break;
    }
    case 'sunglasses': {
      const gy = headCY - headR * 0.1;
      const gx = headR * 0.42;
      const gr = headR * 0.3;
      g.fillStyle(0x1a1a2e, 0.9);
      g.fillCircle(-gx, gy, gr);
      g.fillCircle(gx, gy, gr);
      g.lineStyle(Math.max(1.5, scale), 0x555555, 1);
      g.strokeCircle(-gx, gy, gr);
      g.strokeCircle(gx, gy, gr);
      g.lineBetween(-gx + gr, gy, gx - gr, gy);
      break;
    }
    case 'hat_cap': {
      const capY = headCY - headR * 0.35;
      g.fillStyle(0xe74c3c);
      fillHairCap(g, 0, headCY, headR * 1.05);
      g.fillRect(-headR, capY, headR * 2, headR * 0.6);
      g.fillRect(-headR * 1.5, capY + headR * 0.45, headR * 1.5, headR * 0.25);
      g.fillStyle(0xc0392b);
      g.fillRect(-headR * 0.9, capY, headR * 1.8, headR * 0.22);
      break;
    }
    case 'hat_beanie': {
      g.fillStyle(0x9b59b6);
      fillHairCap(g, 0, headCY, headR * 1.05);
      g.fillRect(-headR * 1.05, headCY - headR * 0.05, headR * 2.1, headR * 0.5);
      g.fillStyle(0x8e44ad);
      g.fillRect(-headR * 1.05, headCY + headR * 0.05, headR * 2.1, headR * 0.25);
      g.fillStyle(0xf39c12);
      g.fillCircle(0, headCY - headR * 1.1, headR * 0.35);
      break;
    }
    case 'hat_sun': {
      g.fillStyle(0xf39c12);
      g.fillEllipse(0, headCY - headR * 0.6, headR * 3, headR * 0.6);
      fillHairCap(g, 0, headCY, headR * 1.05);
      g.fillRect(-headR, headCY - headR * 0.55, headR * 2, headR * 0.6);
      g.fillStyle(0xff69b4);
      g.fillRect(-headR * 0.95, headCY - headR * 0.1, headR * 1.9, headR * 0.22);
      break;
    }
    case 'hair_bow': {
      const bowX = headR * 0.15;
      const bowY = headCY - headR * 1.05;
      g.fillStyle(0xff69b4);
      g.fillTriangle(
        bowX - headR * 0.05, bowY,
        bowX - headR * 0.55, bowY - headR * 0.45,
        bowX - headR * 0.55, bowY + headR * 0.35
      );
      g.fillTriangle(
        bowX + headR * 0.05, bowY,
        bowX + headR * 0.55, bowY - headR * 0.45,
        bowX + headR * 0.55, bowY + headR * 0.35
      );
      g.fillStyle(0xff1493);
      g.fillCircle(bowX, bowY, headR * 0.15);
      break;
    }
    case 'hair_clip': {
      g.fillStyle(0xf1c40f);
      g.fillRect(headR * 0.5, headCY - headR * 0.7, headR * 0.45, headR * 0.2);
      g.fillStyle(0xf39c12);
      g.fillRect(headR * 0.55, headCY - headR * 0.72, headR * 0.15, headR * 0.24);
      break;
    }
    case 'headband': {
      g.lineStyle(Math.max(2, scale * 1.5), 0xff69b4, 1);
      g.beginPath();
      g.arc(0, headCY, headR * 0.9, Math.PI * 1.1, Math.PI * 1.9, false);
      g.strokePath();
      g.fillStyle(0xff1493);
      g.fillCircle(0, headCY - headR * 0.9, Math.max(2, headR * 0.18));
      break;
    }
    default:
      break;
  }
}
