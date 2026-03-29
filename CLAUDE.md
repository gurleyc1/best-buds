# Best Buds — Project Reference

A family game featuring a dad and his 8-year-old daughter Lillian. Built with Phaser 3 + Vite + TypeScript.

## Quick Commands
```bash
npm run dev      # dev server on localhost:3000
npm run build    # TypeScript compile + Vite bundle → dist/
```

---

## Tech Stack
- **Phaser 3** (arcade physics, scene management, graphics API)
- **Vite** (bundler, HMR)
- **TypeScript** (strict mode)
- **Web Audio API** (music + SFX — no audio files, all procedural)
- **localStorage** (save data via SaveManager)
- Canvas: 480×854 (9:16 portrait), pixelArt: true, roundPixels: true

---

## Scene Registry

| Key (SCENE_KEYS) | File | Purpose |
|---|---|---|
| BootScene | scenes/BootScene.ts | Boots → PreloadScene |
| PreloadScene | scenes/PreloadScene.ts | Generates all textures programmatically, shows loading bar |
| MainMenuScene | scenes/MainMenuScene.ts | Title screen, PLAY / CUSTOMIZE buttons |
| CustomizeScene | scenes/CustomizeScene.ts | Character editor with DOM input for name |
| HubScene | scenes/HubScene.ts | Open world (1280×1280), walk/car, location triggers |
| TennisScene | scenes/minigames/TennisScene.ts | Side-view tennis, 1P or 2P |
| SoccerScene | scenes/minigames/SoccerScene.ts | Top-down penalty kicks |
| KeepyUppyScene | scenes/minigames/KeepyUppyScene.ts | Tap balloon to keep it up, wind increases |
| PlaygroundScene | scenes/PlaygroundScene.ts | Interactive equipment (monkey bars, slide, zip line, etc.) |
| IceCreamShopScene | scenes/IceCreamShopScene.ts | Pick ice cream flavor, no gameplay |

**All scenes registered in:** `src/main.ts`
**Scene keys defined in:** `src/config.ts → SCENE_KEYS`

### Scene Data Flow
Mini-games receive `{ returnX, returnY }` from HubScene and pass it back on exit so the player returns to where they were (not home). BaseMiniGameScene handles this via `captureReturnData(data)` and `exitToHub()`.

---

## Hub World Layout

World size: **1280 × 1280**. Camera follows player (lerp 0.1), bounded to world.

```
Roads:
  Horizontal: y=580–620 (gray 0x6b7280), full width
  Vertical:   x=580–620 (gray 0x6b7280), full height
  Sidewalks:  16px beige strips (0xd4c5a0) on both sides of each road

Locations (x, y = center of building):
  Home:          (160, 160)  — no mini-game, "Home sweet home!"
  Park:          (960, 200)  — triggers KeepyUppyScene
  Tennis Court:  (960, 750)  — triggers TennisScene
  Soccer Field:  (200, 900)  — triggers SoccerScene
  Playground:    (700, 900)  — triggers PlaygroundScene
  Ice Cream Shop:(400, 700)  — triggers IceCreamShopScene

Trigger zones: 80×80px centered on each location
Trigger cooldown: 3 seconds on HubScene entry (prevents immediate re-entry)
Player start: (160, 260) or returnX/returnY from previous scene
```

**Transport modes:** walk (80px/s), car (220px/s). Bike was removed.
**Touch movement:** drag finger → character moves toward pointer.

---

## Character System

### CharacterConfig (src/types/index.ts)
```typescript
{
  id: 'dad' | 'lillian'
  name: string           // editable, default 'Dad' / 'Lillian'
  skinTone: number       // hex color
  hairStyle: string      // see HAIR_STYLES in config.ts
  hairColor: number
  clothingStyle: string  // see CLOTHING_STYLES_DAD / _LILLIAN
  topColor: number       // shirt / dress main color
  bottomColor: number    // pants / dress hem accent color
  shoeColor: number
  accessory: string      // see ACCESSORIES in config.ts
}
```

### CharacterRenderer (src/systems/CharacterRenderer.ts)
- `CharacterRenderer.create(scene, x, y, config, scale)` → `Phaser.GameObjects.Container`
- **Scale conventions:** 1.0 = hub world, 1.5 = hub companion, 1.8 = mini-game, 2.5 = menu preview, 3.0 = customize preview
- **Draw order (CRITICAL — do not change):** shoes → legs/clothing → body/shirt → arms → neck/skin → head → **hair** → **face/eyes** → accessory
  - Hair MUST be drawn before face so eyes are never covered
- **Dress styles** (Lillian): no pants drawn; `topColor` = main dress, `bottomColor` = hem accent band
- Dad proportions: bodyW=10, bodyH=18, headR=8 (at scale 1)
- Lillian proportions: bodyW=8, bodyH=14, headR=7 (at scale 1)

### Customization Options
- Hair styles (10): short_messy, short_neat, medium_wavy, long_straight, long_braids, ponytail, buns, curly_short, curly_long, pixie
- Hair colors (10): Blonde, Lt Brown, Dk Brown, Black, Red, Auburn, Gray, Pink, Blue, Purple
- Clothing styles Dad (5): tshirt_shorts, polo_pants, hoodie_jeans, athletic, casual_button
- Clothing styles Lillian (8): tshirt_shorts, dress_simple, dress_floral, dress_sundress, overalls, athletic, skirt_top, hoodie_jeans
- Accessories Dad: none, glasses_round, glasses_square, sunglasses, hat_cap, hat_beanie, hat_sun
- Accessories Lillian: none, hair_bow, hair_clip, headband, sunglasses, hat_cap, hat_sun
- Skin tones (5): Light → Dark
- Clothing colors (12 options for top, bottom, shoes)

---

## Mini-Game Architecture

All mini-games extend `BaseMiniGameScene` (src/scenes/minigames/BaseMiniGameScene.ts):
- `createHUD(label1, label2)` — draws top score bar
- `addScore(player, amount)` — increments score, triggers milestone sfx at multiples of 5
- `showCelebration(message)` — animated celebration text
- `exitToHub()` — saves score, fades out, returns to HubScene with returnX/returnY

**Each mini-game must:**
1. Call `this.captureReturnData(data)` in `create(data?)`
2. Set `protected gameName = 'key'` for high score tracking
3. Call `this.createHUD(...)`
4. Set `this.gameActive = true` when gameplay begins

### Mini-Game Controls

**Tennis:**
- Dad: ↑↓ / WS = move, SPACE = swing. Touch: tap left half = swing
- Lillian (2P): IK = move, N = swing. Touch: tap right half = swing
- Net fault: 2 consecutive net hits OR ball speed < 50px/s near net → reset point

**Soccer (penalty kicks):**
- Step 1 (move): ←→ arrows + SPACE or tap to confirm
- Step 2 (aim): oscillating arrow, SPACE or tap to lock direction
- Step 3 (power): oscillating bar, SPACE or tap to shoot
- Progressive difficulty: kick 1 = easy (500ms delay, 40% coverage), kick 5 = hard (200ms delay, 70%)
- 5 kicks per player, then roles swap (shooter ↔ goalie)

**Keepy Uppy:**
- Touch: tap left half = move Dad, tap right half = move Lillian
- Keyboard: ←/A = move Dad left, →/D = move Lillian right, SPACE = hit balloon
- Hit only registers if balloon is ABOVE tap and within 80px horizontal + 150px vertical of character
- Wind increases every 30s (max 2.5), direction reverses every 45s

---

## Audio System (src/systems/MusicManager.ts)

Web Audio API only — zero external files, no licensing concerns.

```typescript
MusicManager.init()          // call on first user gesture
MusicManager.resume()        // call in each scene create()
MusicManager.playTheme(key)  // 'hub' | 'tennis' | 'soccer' | 'marble' | 'keepy'
MusicManager.stopMusic()     // call in exitToHub() overrides
MusicManager.sfx(name)       // see SFX list below
MusicManager.setMasterVolume(0-1)
```

**SFX names:** hit, bounce, goal, saved, point, miss, celebrate, marble, balloon, select, start, wind

**Important:** Audio context requires a user gesture before starting. Always call `MusicManager.init()` inside a pointer/keyboard event handler, not in `create()` directly. Use `MusicManager.resume()` in `create()` for subsequent scenes.

---

## Assets

All textures are generated programmatically in `PreloadScene.ts` using `this.make.graphics({ add: false }).generateTexture(key, w, h)`.

**No external image files are loaded.** Kenney tiles were downloaded but are not used for ground (replaced with smooth Graphics drawing). They remain in `public/assets/tiles/` and `public/assets/foliage/` if needed later.

**Generated texture keys:** balloon, tennis_ball, soccer_ball, car, bicycle, marble, piece_straight_h, piece_straight_v, piece_curve_*, piece_funnel, piece_spiral, piece_splitter, tile_grass, tile_road, tile_sidewalk, tree, house, tennis_court, soccer_goal, racket, wind_particle

**Car in HubScene:** Uses texture key `car_hub` generated in HubScene.create() (not PreloadScene) because it needs to be recreated each scene entry.

---

## Save System (src/systems/SaveManager.ts)

localStorage key: `best_buds_save`

```typescript
SaveManager.load()                    // → GameState
SaveManager.save(state)
SaveManager.updateScore(game, score)  // only saves if higher than existing
SaveManager.reset()
```

Tracked high scores by game key: 'tennis', 'soccer', 'keepy_uppy', 'playground'

---

## Known Gotchas & Rules

1. **Phaser Containers + Arcade Physics:** `this.physics.add.existing(container)` works but the body is on the container itself. Use `(container.body as Phaser.Physics.Arcade.Body).setVelocity(...)` — don't set `.x`/`.y` directly when physics is enabled or bounds won't be respected.

2. **Graphics vs Image:** `Phaser.GameObjects.Graphics` does NOT have `setFlipX()`. If you need flip, generate a texture first (`generateTexture`) and use `this.add.image(...)` instead.

3. **Web Audio:** Must call `audioContext.resume()` after a user gesture. The AudioContext starts in 'suspended' state in most browsers.

4. **DOM inputs in Phaser:** CustomizeScene creates a `<input>` DOM element for name editing. It MUST be removed in `shutdown()` and when switching tabs. The input position uses `canvas.getBoundingClientRect()` to account for canvas scaling.

5. **`fillArc` does not exist in Phaser:** Use `beginPath()` → `arc()` → `closePath()` → `fillPath()` for filled arcs.

6. **PreloadScene texture generation:** Use `this.make.graphics({ x: 0, y: 0, add: false })` not `this.make.graphics({ add: false })` — the second form can have API issues in some Phaser versions.

7. **Scene transitions:** Always use `SceneTransition.switchScene()` or `SceneTransition.fadeOut().then(...)` — never call `this.scene.start()` directly or the fade won't play.

8. **Mini-game music:** Call `MusicManager.stopMusic()` in `exitToHub()` override, not in the base class, so each game can override cleanly.

9. **Hair draw order:** Hair MUST be drawn BEFORE face elements. Eyes at `headCY + headR * 0.9`, hair dome bottom at `headCY + headR * 0.6`. Never draw hair after eyes.

10. **Trigger cooldown:** HubScene sets `triggerCooldown = 3000ms` on every `create()`. Triggers are skipped while cooldown > 0. This prevents immediately re-entering a location after returning from a mini-game.

---

## File Structure
```
src/
  main.ts                    ← Register ALL scenes here
  config.ts                  ← ALL constants (SCENE_KEYS, GAME_WIDTH, colors, etc.)
  types/index.ts             ← CharacterConfig, GameState, TransportMode
  scenes/
    BootScene.ts
    PreloadScene.ts          ← Generates ALL textures
    MainMenuScene.ts
    CustomizeScene.ts        ← DOM input for name field
    HubScene.ts              ← Open world, location triggers
    PlaygroundScene.ts       ← Interactive equipment
    IceCreamShopScene.ts     ← Flavor picker
    minigames/
      BaseMiniGameScene.ts   ← Abstract base, HUD, scoring, exit
      TennisScene.ts
      SoccerScene.ts
      KeepyUppyScene.ts
  systems/
    CharacterRenderer.ts     ← Procedural character drawing
    SaveManager.ts           ← localStorage
    SceneTransition.ts       ← Fade helpers
    MusicManager.ts          ← Web Audio music + SFX
public/
  assets/
    tiles/                   ← Kenney CC0 tiles (not currently used)
    foliage/                 ← Kenney CC0 foliage (not currently used)
  CREDITS.txt                ← CC0 attribution
```

---

## Deployment Targets
- **Web:** `npm run build` → `dist/` → GitHub Pages (base: `./`)
- **iOS:** Capacitor (not yet configured — add when ready to package)

---

## Art Direction
- Pixel art aesthetic (`pixelArt: true` in Phaser config)
- Characters are procedurally drawn (no sprite sheets)
- All terrain/world drawn with Phaser Graphics (smooth solid colors, no tiled images)
- Tone: warm, family-friendly, slightly realistic (not hyper-cartoon)
- Inspired by: Toca Boca (world feel), Stardew Valley (pixel art quality)
- Music: upbeat pop energy (Taylor Swift-ish), generated via Web Audio API
