import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CustomizeScene } from './scenes/CustomizeScene';
import { HubScene } from './scenes/HubScene';
import { TennisScene } from './scenes/minigames/TennisScene';
import { SoccerScene } from './scenes/minigames/SoccerScene';
import { KeepyUppyScene } from './scenes/minigames/KeepyUppyScene';
import { PlaygroundScene } from './scenes/PlaygroundScene';
import { IceCreamShopScene } from './scenes/IceCreamShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene, PreloadScene, MainMenuScene, CustomizeScene,
    HubScene, TennisScene, SoccerScene, KeepyUppyScene,
    PlaygroundScene, IceCreamShopScene,
  ],
};

new Phaser.Game(config);
