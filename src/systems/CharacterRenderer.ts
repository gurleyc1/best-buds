import Phaser from 'phaser';
import { CharacterConfig } from '../types';

// ─── Color helpers ────────────────────────────────────────────────────────────

function darken(color: number, factor = 0.7): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function lighten(color: number, factor = 1.3): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// ─── Semi-circle / hair-cap helpers ──────────────────────────────────────────

function fillTopSemicircle(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number
): void {
  g.beginPath();
  g.arc(cx, cy, r, Math.PI, 0, false);
  g.closePath();
  g.fillPath();
}

// ─── Main renderer ────────────────────────────────────────────────────────────

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

    // ── Proportions (at scale=1) ──────────────────────────────────────────
    const headR   = (isDad ? 8 : 7) * scale;
    const bodyW   = (isDad ? 10 : 8) * scale;
    const bodyH   = (isDad ? 18 : 14) * scale;
    const legH    = (isDad ? 14 : 11) * scale;
    const legW    = (isDad ? 4 : 3) * scale;
    const shoeH   = (isDad ? 4 : 3) * scale;
    const shoeW   = (isDad ? 6 : 5) * scale;
    const neckH   = (isDad ? 3 : 2) * scale;
    const neckW   = (isDad ? 4 : 3) * scale;
    const armW    = (isDad ? 3 : 2.5) * scale;
    const armH    = (isDad ? 10 : 8) * scale;
    // shoulder width: wider on Dad
    const shoulderExtra = (isDad ? 3 : 1) * scale;

    // ── Layout anchors (feet at y=0, builds upward) ───────────────────────
    const feetY       = 0;
    const legTopY     = feetY - legH;
    const bodyBottomY = legTopY;
    const bodyTopY    = bodyBottomY - bodyH;
    const neckBottomY = bodyTopY;
    const neckTopY    = neckBottomY - neckH;
    const headCY      = neckTopY - headR;

    // ── Shoes ─────────────────────────────────────────────────────────────
    const leftShoeX  = -legW * 0.9 - shoeW * 0.1;
    const rightShoeX =  legW * 0.9 - shoeW * 0.1;
    const shoeY      = feetY - shoeH * 0.5;

    // shadow / main
    g.fillStyle(darken(config.shoeColor, 0.7));
    g.fillEllipse(leftShoeX  + shoeW * 0.15, shoeY + shoeH * 0.15, shoeW * 1.9, shoeH * 0.85);
    g.fillEllipse(rightShoeX + shoeW * 0.15, shoeY + shoeH * 0.15, shoeW * 1.9, shoeH * 0.85);

    g.fillStyle(config.shoeColor);
    g.fillEllipse(leftShoeX,  shoeY, shoeW * 1.9, shoeH);
    g.fillEllipse(rightShoeX, shoeY, shoeW * 1.9, shoeH);

    // highlight stripe on toe
    g.fillStyle(lighten(config.shoeColor, 1.4));
    g.fillEllipse(leftShoeX  - shoeW * 0.25, shoeY - shoeH * 0.1, shoeW * 0.5, shoeH * 0.3);
    g.fillEllipse(rightShoeX - shoeW * 0.25, shoeY - shoeH * 0.1, shoeW * 0.5, shoeH * 0.3);

    // ── Legs / pants ──────────────────────────────────────────────────────
    const leftLegX  = -legW * 0.9 - legW;
    const rightLegX =  legW * 0.9;

    // shadow side of each leg (right side of each)
    g.fillStyle(darken(config.bottomColor, 0.75));
    g.fillRect(leftLegX  + legW * 0.55, legTopY, legW * 0.45, legH);
    g.fillRect(rightLegX + legW * 0.55, legTopY, legW * 0.45, legH);

    g.fillStyle(config.bottomColor);
    g.fillRect(leftLegX,  legTopY, legW, legH);
    g.fillRect(rightLegX, legTopY, legW, legH);

    // waistband
    const waistH = Math.max(2, 2 * scale);
    g.fillStyle(darken(config.bottomColor, 0.65));
    g.fillRect(-bodyW / 2, bodyBottomY - waistH, bodyW, waistH);

    // ── Body / shirt ──────────────────────────────────────────────────────
    // shadow: right half of body
    g.fillStyle(darken(config.topColor, 0.75));
    g.fillRect(0, bodyTopY, bodyW / 2, bodyH);

    g.fillStyle(config.topColor);
    g.fillRect(-bodyW / 2, bodyTopY, bodyW, bodyH);

    // re-draw shadow on top so it overlaps properly
    g.fillStyle(darken(config.topColor, 0.75));
    g.fillRect(bodyW * 0.15, bodyTopY, bodyW * 0.35, bodyH);

    // shoulder "wings" — wider on dad
    g.fillStyle(config.topColor);
    g.fillRect(-bodyW / 2 - shoulderExtra, bodyTopY, shoulderExtra, bodyH * 0.25);
    g.fillRect( bodyW / 2,                bodyTopY, shoulderExtra, bodyH * 0.25);

    // collar V-shape highlight
    g.fillStyle(lighten(config.topColor, 1.25));
    g.fillTriangle(
      0,            bodyTopY,
      -bodyW * 0.28, bodyTopY + bodyH * 0.18,
       bodyW * 0.28, bodyTopY + bodyH * 0.18
    );

    // ── Arms ──────────────────────────────────────────────────────────────
    const armTopY = bodyTopY + bodyH * 0.05;

    // left arm (lit side)
    g.fillStyle(config.skinTone);
    g.fillRect(-bodyW / 2 - shoulderExtra - armW, armTopY, armW, armH);
    // left arm shadow
    g.fillStyle(darken(config.skinTone, 0.8));
    g.fillRect(-bodyW / 2 - shoulderExtra - armW + armW * 0.6, armTopY, armW * 0.4, armH);

    // right arm
    g.fillStyle(config.skinTone);
    g.fillRect(bodyW / 2 + shoulderExtra, armTopY, armW, armH);
    // right arm shadow
    g.fillStyle(darken(config.skinTone, 0.8));
    g.fillRect(bodyW / 2 + shoulderExtra + armW * 0.6, armTopY, armW * 0.4, armH);

    // hands (rounded bottom of arms)
    g.fillStyle(config.skinTone);
    g.fillCircle(-bodyW / 2 - shoulderExtra - armW / 2, armTopY + armH, armW * 0.65);
    g.fillCircle( bodyW / 2 + shoulderExtra + armW / 2, armTopY + armH, armW * 0.65);

    // ── Neck ──────────────────────────────────────────────────────────────
    g.fillStyle(darken(config.skinTone, 0.85));
    g.fillRect(-neckW / 2 + neckW * 0.3, neckBottomY - neckH, neckW * 0.4, neckH);

    g.fillStyle(config.skinTone);
    g.fillRect(-neckW / 2, neckBottomY - neckH, neckW, neckH);

    // ── Head ──────────────────────────────────────────────────────────────
    // shadow on right side of head (draw full head lit, then overlay shadow arc)
    g.fillStyle(config.skinTone);
    g.fillCircle(0, headCY, headR);

    // shadow: right side crescent
    g.fillStyle(darken(config.skinTone, 0.85));
    g.beginPath();
    g.arc(0, headCY, headR, -Math.PI / 2, Math.PI / 2, false);
    g.closePath();
    g.fillPath();

    // re-draw left (lit) half on top
    g.fillStyle(config.skinTone);
    g.beginPath();
    g.arc(0, headCY, headR, Math.PI / 2, -Math.PI / 2, false);
    g.closePath();
    g.fillPath();

    // ── Face features ─────────────────────────────────────────────────────
    const eyeY      = headCY - headR * 0.1;
    const eyeSpacing = headR * 0.42;
    const eyeR      = Math.max(1.2, headR * 0.17);

    // eyebrows
    const browW  = eyeR * 2.2;
    const browH  = Math.max(1, scale * 0.8);
    const browY  = eyeY - eyeR * 2.0;
    const browColor = isDad ? 0x3d2b1f : darken(config.hairColor, 0.8);
    g.fillStyle(browColor);
    g.fillRect(-eyeSpacing - browW / 2,     browY, browW,       browH);
    g.fillRect( eyeSpacing - browW / 2,     browY, browW,       browH);

    // eyes (dark iris + white glint)
    g.fillStyle(0x1a1a2e);
    g.fillCircle(-eyeSpacing, eyeY, eyeR);
    g.fillCircle( eyeSpacing, eyeY, eyeR);

    g.fillStyle(0xffffff);
    g.fillCircle(-eyeSpacing + eyeR * 0.35, eyeY - eyeR * 0.35, Math.max(0.8, eyeR * 0.38));
    g.fillCircle( eyeSpacing + eyeR * 0.35, eyeY - eyeR * 0.35, Math.max(0.8, eyeR * 0.38));

    // nose — tiny dot/oval
    const noseY = headCY + headR * 0.12;
    g.fillStyle(darken(config.skinTone, 0.72));
    g.fillEllipse(0, noseY, Math.max(1.5, eyeR * 0.7), Math.max(1, eyeR * 0.5));

    // smile arc
    const smileY = headCY + headR * 0.38;
    const smileW = Math.max(1, scale * 0.9);
    g.lineStyle(smileW, 0x1a1a2e, 1);
    g.beginPath();
    g.arc(0, smileY - headR * 0.12, headR * 0.32, 0.25, Math.PI - 0.25, false);
    g.strokePath();

    // rosy cheeks (always for Lillian, subtle for Dad)
    const cheekAlpha = isDad ? 0.2 : 0.45;
    const cheekR     = headR * 0.22;
    g.fillStyle(0xff9999, cheekAlpha);
    g.fillCircle(-eyeSpacing * 0.95, eyeY + eyeR * 2.2, cheekR);
    g.fillCircle( eyeSpacing * 0.95, eyeY + eyeR * 2.2, cheekR);

    // stubble on Dad (only when no beard accessory)
    if (isDad && config.accessory !== 'beard') {
      const stubbleColor = 0x5a3e2b;
      const stubbleY = headCY + headR * 0.28;
      const dotR = Math.max(0.6, scale * 0.55);
      g.fillStyle(stubbleColor, 0.55);
      const stubblePositions = [
        { x: -headR * 0.38, y: stubbleY },
        { x: -headR * 0.15, y: stubbleY + headR * 0.08 },
        { x:  headR * 0.1,  y: stubbleY },
        { x:  headR * 0.33, y: stubbleY + headR * 0.06 },
        { x: -headR * 0.25, y: stubbleY + headR * 0.18 },
        { x:  headR * 0.2,  y: stubbleY + headR * 0.16 },
      ];
      for (const p of stubblePositions) {
        g.fillCircle(p.x, p.y, dotR);
      }
    }

    // ── Hair ──────────────────────────────────────────────────────────────
    drawHair(g, config.hairStyle, config.hairColor, headCY, headR, scale, isDad);

    // ── Accessory ─────────────────────────────────────────────────────────
    drawAccessory(g, config.accessory, headCY, headR, scale, config.hairColor);

    container.add(g);
    return container;
  }
}

// ─── Hair drawing ─────────────────────────────────────────────────────────────

function drawHair(
  g: Phaser.GameObjects.Graphics,
  style: string,
  color: number,
  headCY: number,
  headR: number,
  scale: number,
  _isDad: boolean
): void {
  const hl  = lighten(color, 1.4);   // highlight streak color
  const shd = darken(color, 0.72);   // shadow color

  // Helper: fill the top dome of the head in hair color
  function hairDome(radiusMult = 1.06): void {
    g.fillStyle(color);
    fillTopSemicircle(g, 0, headCY, headR * radiusMult);

    // highlight streak across upper-left of dome
    g.fillStyle(hl);
    g.fillEllipse(-headR * 0.25, headCY - headR * 0.65, headR * 0.3, headR * 0.18);

    // shadow on right side of dome
    g.fillStyle(shd);
    g.beginPath();
    g.arc(0, headCY, headR * radiusMult, -Math.PI * 0.45, 0, false);
    g.closePath();
    g.fillPath();
  }

  switch (style) {

    // ── Short messy ────────────────────────────────────────────────────
    case 'short_messy': {
      hairDome(1.05);

      // spiky tufts in different directions
      g.fillStyle(color);
      const spikeData = [
        { bx: -headR * 0.55, lean: -headR * 0.22, h: headR * 0.55 },
        { bx: -headR * 0.2,  lean:  headR * 0.15, h: headR * 0.62 },
        { bx:  headR * 0.15, lean: -headR * 0.1,  h: headR * 0.58 },
        { bx:  headR * 0.5,  lean:  headR * 0.2,  h: headR * 0.5  },
        { bx: -headR * 0.05, lean:  headR * 0.05, h: headR * 0.68 },
      ];
      const baseY = headCY - headR * 0.92;
      for (const sp of spikeData) {
        g.fillTriangle(
          sp.bx - headR * 0.14, baseY,
          sp.bx + headR * 0.14, baseY,
          sp.bx + sp.lean,       baseY - sp.h
        );
      }
      // shadow tufts
      g.fillStyle(shd);
      for (const sp of spikeData.slice(2)) {
        g.fillTriangle(
          sp.bx,                baseY,
          sp.bx + headR * 0.14, baseY,
          sp.bx + sp.lean,       baseY - sp.h
        );
      }
      break;
    }

    // ── Short neat ─────────────────────────────────────────────────────
    case 'short_neat': {
      hairDome(1.05);

      // clean side-part line
      g.lineStyle(Math.max(1, scale * 0.9), shd, 0.9);
      g.lineBetween(-headR * 0.08, headCY - headR, -headR * 0.08, headCY - headR * 0.35);

      // slight sideburn fill at bottom of dome edge
      g.fillStyle(color);
      g.fillRect(-headR * 1.06, headCY - headR * 0.1, headR * 0.28, headR * 0.55);
      g.fillRect( headR * 0.78, headCY - headR * 0.1, headR * 0.28, headR * 0.55);
      break;
    }

    // ── Medium wavy ────────────────────────────────────────────────────
    case 'medium_wavy': {
      // wavy side panels extending to shoulder height
      const waveCount = 4;
      const waveH     = headR * 0.65;
      const panelW    = headR * 0.75;

      // left side
      for (let i = 0; i < waveCount; i++) {
        const wy   = headCY + i * waveH * 0.88;
        const offX = (i % 2 === 0) ? headR * 0.12 : 0;
        g.fillStyle(i % 2 === 0 ? color : shd);
        g.fillEllipse(-headR - panelW / 2 + offX, wy + waveH / 2, panelW, waveH);
      }
      // right side
      for (let i = 0; i < waveCount; i++) {
        const wy   = headCY + i * waveH * 0.88;
        const offX = (i % 2 === 0) ? -headR * 0.12 : 0;
        g.fillStyle(i % 2 === 0 ? shd : color);
        g.fillEllipse( headR + panelW / 2 + offX, wy + waveH / 2, panelW, waveH);
      }

      hairDome(1.06);
      // re-paint highlight
      g.fillStyle(hl);
      g.fillEllipse(-headR * 0.22, headCY - headR * 0.65, headR * 0.28, headR * 0.16);
      break;
    }

    // ── Long straight ──────────────────────────────────────────────────
    case 'long_straight': {
      const panelW = headR * 0.72;
      const longH  = headR * 3.2;

      // draw side panels first (behind head)
      g.fillStyle(shd);
      g.fillRect(-headR - panelW + panelW * 0.45, headCY - headR * 0.3, panelW * 0.5, longH);
      g.fillRect( headR - panelW * 0.45,           headCY - headR * 0.3, panelW * 0.5, longH);

      g.fillStyle(color);
      g.fillRect(-headR - panelW + panelW * 0.0,  headCY - headR * 0.3, panelW, longH);
      g.fillRect( headR,                            headCY - headR * 0.3, panelW, longH);

      // highlight streak on left panel
      g.fillStyle(hl);
      g.fillRect(-headR - panelW + panelW * 0.1, headCY, panelW * 0.18, longH * 0.65);

      // tapered ends
      g.fillStyle(color);
      g.fillEllipse(-headR - panelW * 0.5, headCY - headR * 0.3 + longH, panelW, headR * 0.45);
      g.fillEllipse( headR + panelW * 0.5, headCY - headR * 0.3 + longH, panelW, headR * 0.45);

      hairDome(1.06);
      break;
    }

    // ── Long braids ────────────────────────────────────────────────────
    case 'long_braids': {
      const braidW = headR * 0.58;
      const segH   = headR * 0.52;
      const numSeg = 7;
      const leftX  = -headR * 0.88;
      const rightX =  headR * 0.88;

      for (let s = 0; s < numSeg; s++) {
        const yTop     = headCY + s * segH * 0.92;
        const narrow   = 1 - s * 0.035;
        const segColor = s % 2 === 0 ? color : darken(color, 0.82);
        const segLight = s % 2 === 0 ? lighten(color, 1.2) : color;

        // left braid segment
        g.fillStyle(segColor);
        g.fillEllipse(leftX, yTop + segH / 2, braidW * narrow, segH * 0.88);
        // highlight
        g.fillStyle(segLight);
        g.fillEllipse(leftX - braidW * 0.15 * narrow, yTop + segH * 0.3, braidW * 0.28 * narrow, segH * 0.28);

        // right braid segment
        g.fillStyle(segColor);
        g.fillEllipse(rightX, yTop + segH / 2, braidW * narrow, segH * 0.88);
        // highlight (shadow side)
        g.fillStyle(darken(segColor, 0.8));
        g.fillEllipse(rightX + braidW * 0.15 * narrow, yTop + segH * 0.3, braidW * 0.28 * narrow, segH * 0.28);

        // cross-stitch lines between segments
        if (s < numSeg - 1) {
          g.lineStyle(Math.max(1, scale * 0.7), darken(color, 0.55), 0.9);
          const stitchY = yTop + segH * 0.88;
          g.lineBetween(leftX  - braidW * 0.38 * narrow, stitchY, leftX  + braidW * 0.38 * narrow, stitchY);
          g.lineBetween(rightX - braidW * 0.38 * narrow, stitchY, rightX + braidW * 0.38 * narrow, stitchY);
        }
      }

      // ribbon ties at braid ends
      const tieY = headCY + numSeg * segH * 0.92;
      g.fillStyle(0xff69b4);
      g.fillCircle(leftX,  tieY, headR * 0.27);
      g.fillCircle(rightX, tieY, headR * 0.27);
      g.fillStyle(0xff1493);
      g.fillCircle(leftX,  tieY, headR * 0.13);
      g.fillCircle(rightX, tieY, headR * 0.13);

      hairDome(1.06);
      break;
    }

    // ── Ponytail ───────────────────────────────────────────────────────
    case 'ponytail': {
      hairDome(1.05);

      // gathering band (slightly raised, center-right of head)
      const bandX = headR * 0.18;
      const bandY = headCY - headR * 0.72;
      g.fillStyle(0xff69b4);
      g.fillEllipse(bandX, bandY, headR * 0.5, headR * 0.32);

      // flowing tail — main + shadow
      const tailX = headR * 0.28;
      g.fillStyle(shd);
      g.fillEllipse(tailX + headR * 0.1, headCY - headR * 1.1, headR * 0.45, headR * 2.1);
      g.fillStyle(color);
      g.fillEllipse(tailX, headCY - headR * 1.15, headR * 0.42, headR * 2.0);

      // highlight on tail
      g.fillStyle(hl);
      g.fillEllipse(tailX - headR * 0.06, headCY - headR * 0.85, headR * 0.12, headR * 0.65);
      break;
    }

    // ── Buns ───────────────────────────────────────────────────────────
    case 'buns': {
      hairDome(0.97);

      const bunR = headR * 0.58;
      const bunY = headCY - headR * 0.85;

      // left bun: lit then shadow
      g.fillStyle(color);
      g.fillCircle(-headR * 0.6, bunY, bunR);
      g.fillStyle(shd);
      g.beginPath();
      g.arc(-headR * 0.6, bunY, bunR, -Math.PI / 2, Math.PI / 2, false);
      g.closePath();
      g.fillPath();
      // highlight
      g.fillStyle(hl);
      g.fillEllipse(-headR * 0.75, bunY - bunR * 0.3, bunR * 0.42, bunR * 0.28);

      // right bun
      g.fillStyle(color);
      g.fillCircle(headR * 0.6, bunY, bunR);
      g.fillStyle(shd);
      g.beginPath();
      g.arc(headR * 0.6, bunY, bunR, -Math.PI / 2, Math.PI / 2, false);
      g.closePath();
      g.fillPath();
      // highlight
      g.fillStyle(hl);
      g.fillEllipse(headR * 0.45, bunY - bunR * 0.3, bunR * 0.42, bunR * 0.28);
      break;
    }

    // ── Curly short ────────────────────────────────────────────────────
    case 'curly_short': {
      // cluster of tight ovals around head perimeter
      const numCurls = 10;
      for (let i = 0; i < numCurls; i++) {
        const angle = (i / numCurls) * Math.PI; // top half
        const cx = Math.cos(angle) * headR * 1.08;
        const cy = headCY - Math.sin(angle) * headR * 0.9;
        const cShd = i > numCurls / 2;
        g.fillStyle(cShd ? shd : color);
        g.fillEllipse(cx, cy, headR * 0.45, headR * 0.42);
      }
      hairDome(0.92);
      // highlight curls on top
      g.fillStyle(hl);
      g.fillEllipse(-headR * 0.22, headCY - headR * 0.9, headR * 0.2, headR * 0.15);
      break;
    }

    // ── Curly long ─────────────────────────────────────────────────────
    case 'curly_long': {
      // long side curl clusters
      const clusterRows = 5;
      for (let i = 0; i < clusterRows; i++) {
        const rowY = headCY + i * headR * 0.7;
        const cShd = i % 2 !== 0;
        g.fillStyle(cShd ? shd : color);
        // left cluster
        g.fillEllipse(-headR * 1.18, rowY, headR * 0.5, headR * 0.5);
        g.fillEllipse(-headR * 1.38, rowY + headR * 0.22, headR * 0.42, headR * 0.42);
        // right cluster (always shadow)
        g.fillStyle(shd);
        g.fillEllipse( headR * 1.18, rowY, headR * 0.5, headR * 0.5);
        g.fillEllipse( headR * 1.38, rowY + headR * 0.22, headR * 0.42, headR * 0.42);
      }

      // top perimeter curls
      const numCurls = 10;
      for (let i = 0; i < numCurls; i++) {
        const angle = (i / numCurls) * Math.PI;
        const cx = Math.cos(angle) * headR * 1.08;
        const cy = headCY - Math.sin(angle) * headR * 0.9;
        g.fillStyle(i > numCurls / 2 ? shd : color);
        g.fillEllipse(cx, cy, headR * 0.45, headR * 0.42);
      }

      hairDome(0.92);
      g.fillStyle(hl);
      g.fillEllipse(-headR * 0.22, headCY - headR * 0.9, headR * 0.2, headR * 0.15);
      break;
    }

    // ── Pixie ──────────────────────────────────────────────────────────
    case 'pixie': {
      // flat short asymmetric crop
      hairDome(1.02);

      // asymmetric fringe swept to one side
      g.fillStyle(color);
      g.fillRect(-headR * 0.9, headCY - headR * 0.18, headR * 1.55, headR * 0.32);

      // shadow on fringe right edge
      g.fillStyle(shd);
      g.fillRect( headR * 0.45, headCY - headR * 0.16, headR * 0.2, headR * 0.28);

      // small swept-up piece on left
      g.fillStyle(color);
      g.fillTriangle(
        -headR * 0.9, headCY - headR * 0.18,
        -headR * 1.08, headCY - headR * 0.55,
        -headR * 0.65, headCY - headR * 0.18
      );
      break;
    }

    default: {
      hairDome(1.05);
      break;
    }
  }
}

// ─── Accessory drawing ────────────────────────────────────────────────────────

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

    // ── Round glasses ──────────────────────────────────────────────────
    case 'glasses_round': {
      const gy = headCY - headR * 0.1;
      const gx = headR * 0.44;
      const gr = headR * 0.31;

      // tinted lens fill
      g.fillStyle(0x7ecbff, 0.2);
      g.fillCircle(-gx, gy, gr);
      g.fillCircle( gx, gy, gr);

      // frame outline
      g.lineStyle(Math.max(1.5, scale * 1.1), 0x2c3e50, 1);
      g.strokeCircle(-gx, gy, gr);
      g.strokeCircle( gx, gy, gr);

      // bridge
      g.lineBetween(-gx + gr, gy, gx - gr, gy);

      // temples (arms extending to sides)
      g.lineBetween(-gx - gr, gy, -gx - gr - headR * 0.28, gy - headR * 0.08);
      g.lineBetween( gx + gr, gy,  gx + gr + headR * 0.28, gy - headR * 0.08);
      break;
    }

    // ── Square glasses ─────────────────────────────────────────────────
    case 'glasses_square': {
      const gy = headCY - headR * 0.12;
      const gw = headR * 0.58;
      const gh = headR * 0.44;
      const lx = -headR * 0.76;
      const rx =  headR * 0.18;

      // tinted fill
      g.fillStyle(0x7ecbff, 0.2);
      g.fillRect(lx, gy - gh / 2, gw, gh);
      g.fillRect(rx, gy - gh / 2, gw, gh);

      // frames
      g.lineStyle(Math.max(1.5, scale * 1.1), 0x2c3e50, 1);
      g.strokeRect(lx, gy - gh / 2, gw, gh);
      g.strokeRect(rx, gy - gh / 2, gw, gh);

      // bridge
      g.lineBetween(lx + gw, gy, rx, gy);

      // temples
      g.lineBetween(lx, gy, lx - headR * 0.28, gy - headR * 0.08);
      g.lineBetween(rx + gw, gy, rx + gw + headR * 0.28, gy - headR * 0.08);
      break;
    }

    // ── Sunglasses ─────────────────────────────────────────────────────
    case 'sunglasses': {
      const gy = headCY - headR * 0.1;
      const gx = headR * 0.44;
      const gr = headR * 0.31;

      // dark tinted fill (gradient-ish: lighter at top)
      g.fillStyle(0x111122, 0.92);
      g.fillCircle(-gx, gy, gr);
      g.fillCircle( gx, gy, gr);

      // subtle highlight at top of each lens
      g.fillStyle(0x4466aa, 0.35);
      g.fillEllipse(-gx - gr * 0.1, gy - gr * 0.32, gr * 0.65, gr * 0.28);
      g.fillEllipse( gx - gr * 0.1, gy - gr * 0.32, gr * 0.65, gr * 0.28);

      // frame
      g.lineStyle(Math.max(1.5, scale * 1.1), 0x333344, 1);
      g.strokeCircle(-gx, gy, gr);
      g.strokeCircle( gx, gy, gr);
      g.lineBetween(-gx + gr, gy, gx - gr, gy);
      g.lineBetween(-gx - gr, gy, -headR, gy - headR * 0.05);
      g.lineBetween( gx + gr, gy,  headR, gy - headR * 0.05);
      break;
    }

    // ── Cap / baseball hat ─────────────────────────────────────────────
    case 'hat_cap': {
      const capColor   = 0xe74c3c;
      const capShd     = darken(capColor, 0.72);
      const capHl      = lighten(capColor, 1.25);

      // crown fill (hair dome shaped)
      g.fillStyle(capColor);
      fillTopSemicircle(g, 0, headCY, headR * 1.1);

      // shadow side of crown
      g.fillStyle(capShd);
      g.beginPath();
      g.arc(0, headCY, headR * 1.1, -Math.PI * 0.45, 0, false);
      g.closePath();
      g.fillPath();

      // brim band (seam at base of crown)
      g.fillStyle(capShd);
      g.fillRect(-headR * 1.1, headCY - headR * 0.12, headR * 2.2, headR * 0.22);

      // highlight stripe on crown
      g.fillStyle(capHl);
      g.fillEllipse(-headR * 0.28, headCY - headR * 0.78, headR * 0.22, headR * 0.55);

      // button on very top
      g.fillStyle(capShd);
      g.fillCircle(0, headCY - headR * 1.08, Math.max(1.5, headR * 0.16));

      // visor brim (offset right/forward)
      g.fillStyle(capColor);
      g.fillEllipse(-headR * 0.9, headCY - headR * 0.05, headR * 2.1, headR * 0.38);

      // visor underside shadow
      g.fillStyle(capShd);
      g.fillEllipse(-headR * 0.9, headCY - headR * 0.02, headR * 2.1, headR * 0.18);
      break;
    }

    // ── Beanie ─────────────────────────────────────────────────────────
    case 'hat_beanie': {
      const bColor = 0x9b59b6;
      const bShd   = darken(bColor, 0.72);
      const bHl    = lighten(bColor, 1.2);
      const stripeAlt = 0x8e44ad;

      // main beanie dome
      g.fillStyle(bColor);
      fillTopSemicircle(g, 0, headCY, headR * 1.12);

      // ribbed stripes (alternating bands)
      const stripeCount = 5;
      for (let s = 0; s < stripeCount; s++) {
        const angle1 = Math.PI - (s / stripeCount) * Math.PI;
        const angle2 = Math.PI - ((s + 0.55) / stripeCount) * Math.PI;
        g.fillStyle(s % 2 === 0 ? stripeAlt : bShd);
        g.beginPath();
        g.arc(0, headCY, headR * 1.12, angle1, angle2, true);
        g.lineTo(0, headCY);
        g.closePath();
        g.fillPath();
      }

      // highlight
      g.fillStyle(bHl);
      g.fillEllipse(-headR * 0.28, headCY - headR * 0.75, headR * 0.22, headR * 0.48);

      // cuff / brim band
      g.fillStyle(bShd);
      g.fillRect(-headR * 1.12, headCY - headR * 0.14, headR * 2.24, headR * 0.28);
      g.fillStyle(bColor);
      g.fillRect(-headR * 1.12, headCY - headR * 0.14, headR * 2.24, headR * 0.14);

      // pom-pom on top
      g.fillStyle(0xf39c12);
      g.fillCircle(0, headCY - headR * 1.14, headR * 0.38);
      g.fillStyle(lighten(0xf39c12, 1.3));
      g.fillEllipse(-headR * 0.08, headCY - headR * 1.24, headR * 0.18, headR * 0.14);
      break;
    }

    // ── Sun hat ────────────────────────────────────────────────────────
    case 'hat_sun': {
      const hColor = 0xf4d03f;
      const hShd   = darken(hColor, 0.72);
      const hHl    = lighten(hColor, 1.25);

      // wide floppy brim (drawn first, behind crown)
      g.fillStyle(hShd);
      g.fillEllipse(0, headCY - headR * 0.55, headR * 3.2, headR * 0.7);
      g.fillStyle(hColor);
      g.fillEllipse(0, headCY - headR * 0.6,  headR * 3.2, headR * 0.62);

      // brim underside shadow
      g.fillStyle(hShd);
      g.fillEllipse(0, headCY - headR * 0.56, headR * 3.0, headR * 0.28);

      // crown
      g.fillStyle(hColor);
      fillTopSemicircle(g, 0, headCY, headR * 1.08);

      // crown shadow side
      g.fillStyle(hShd);
      g.beginPath();
      g.arc(0, headCY, headR * 1.08, -Math.PI * 0.42, 0, false);
      g.closePath();
      g.fillPath();

      // crown highlight
      g.fillStyle(hHl);
      g.fillEllipse(-headR * 0.26, headCY - headR * 0.72, headR * 0.2, headR * 0.5);

      // ribbon band
      g.fillStyle(0xff69b4);
      g.fillRect(-headR * 1.08, headCY - headR * 0.15, headR * 2.16, headR * 0.26);
      g.fillStyle(darken(0xff69b4, 0.72));
      g.fillRect(-headR * 1.08, headCY - headR * 0.02, headR * 2.16, headR * 0.1);
      break;
    }

    // ── Hair bow ───────────────────────────────────────────────────────
    case 'hair_bow': {
      const bowX  = headR * 0.12;
      const bowY  = headCY - headR * 1.08;
      const pink  = 0xff69b4;
      const dpink = darken(pink, 0.72);

      // left wing
      g.fillStyle(pink);
      g.fillTriangle(
        bowX - headR * 0.06, bowY,
        bowX - headR * 0.62, bowY - headR * 0.48,
        bowX - headR * 0.58, bowY + headR * 0.38
      );
      // shadow on left wing
      g.fillStyle(dpink);
      g.fillTriangle(
        bowX - headR * 0.06,  bowY,
        bowX - headR * 0.34,  bowY - headR * 0.24,
        bowX - headR * 0.32,  bowY + headR * 0.19
      );

      // right wing
      g.fillStyle(pink);
      g.fillTriangle(
        bowX + headR * 0.06, bowY,
        bowX + headR * 0.62, bowY - headR * 0.48,
        bowX + headR * 0.58, bowY + headR * 0.38
      );
      // shadow on right wing
      g.fillStyle(dpink);
      g.fillTriangle(
        bowX + headR * 0.06,  bowY,
        bowX + headR * 0.34,  bowY - headR * 0.24,
        bowX + headR * 0.32,  bowY + headR * 0.19
      );

      // knot center
      g.fillStyle(0xff1493);
      g.fillCircle(bowX, bowY, headR * 0.18);
      g.fillStyle(lighten(pink, 1.3));
      g.fillEllipse(bowX - headR * 0.04, bowY - headR * 0.06, headR * 0.12, headR * 0.09);
      break;
    }

    // ── Hair clip ──────────────────────────────────────────────────────
    case 'hair_clip': {
      const cx    = headR * 0.52;
      const cy    = headCY - headR * 0.68;
      const clipW = headR * 0.52;
      const clipH = headR * 0.22;

      // clip body (gold)
      g.fillStyle(0xf1c40f);
      g.fillRect(cx, cy, clipW, clipH);

      // clip ridge lines (sparkle effect)
      g.lineStyle(Math.max(1, scale * 0.7), 0xf39c12, 1);
      g.lineBetween(cx + clipW * 0.25, cy, cx + clipW * 0.25, cy + clipH);
      g.lineBetween(cx + clipW * 0.5,  cy, cx + clipW * 0.5,  cy + clipH);
      g.lineBetween(cx + clipW * 0.75, cy, cx + clipW * 0.75, cy + clipH);

      // sparkle dots
      g.fillStyle(0xffeaa7);
      g.fillCircle(cx + clipW * 0.15, cy + clipH * 0.3, Math.max(0.8, scale * 0.6));
      g.fillCircle(cx + clipW * 0.6,  cy + clipH * 0.7, Math.max(0.8, scale * 0.6));

      // clip lower jaw
      g.fillStyle(darken(0xf1c40f, 0.72));
      g.fillRect(cx, cy + clipH * 0.7, clipW, clipH * 0.35);
      break;
    }

    // ── Headband ───────────────────────────────────────────────────────
    case 'headband': {
      const hbColor  = 0xff69b4;
      const hbShd    = darken(hbColor, 0.72);
      const bandThick = Math.max(3, headR * 0.22);

      // main band arc
      g.lineStyle(bandThick, hbColor, 1);
      g.beginPath();
      g.arc(0, headCY, headR * 0.94, Math.PI * 1.08, Math.PI * 1.92, false);
      g.strokePath();

      // shadow edge of band
      g.lineStyle(bandThick * 0.4, hbShd, 0.85);
      g.beginPath();
      g.arc(0, headCY, headR * 0.94, Math.PI * 1.38, Math.PI * 1.75, false);
      g.strokePath();

      // pattern dots on band
      g.fillStyle(0xff1493);
      const dotCount = 4;
      for (let d = 0; d < dotCount; d++) {
        const angle = Math.PI * 1.18 + (d / (dotCount - 1)) * Math.PI * 0.64;
        const dx = Math.cos(angle) * headR * 0.94;
        const dy = headCY + Math.sin(angle) * headR * 0.94;
        g.fillCircle(dx, dy, Math.max(1, headR * 0.08));
      }
      break;
    }

    default:
      break;
  }
}
