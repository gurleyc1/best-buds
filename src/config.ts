export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

export const COLORS = {
  SKY: 0x87ceeb,
  GRASS: 0x4caf50,
  ROAD: 0x607d8b,
  SIDEWALK: 0xbcaaa4,
  BG_DARK: 0x1a1a2e,
  BG_MID: 0x16213e,
  WHITE: 0xffffff,
  BLACK: 0x000000,
  YELLOW: 0xffd700,
  RED: 0xe74c3c,
  BLUE: 0x3498db,
  GREEN: 0x2ecc71,
  PINK: 0xff69b4,
  PURPLE: 0x9b59b6,
  ORANGE: 0xe67e22,
  TEAL: 0x1abc9c,
  LIGHT_GRAY: 0xecf0f1,
  DARK_GRAY: 0x2c3e50,
};

export const HAIR_STYLES = [
  'short_messy', 'short_neat', 'medium_wavy', 'long_straight',
  'long_braids', 'ponytail', 'buns', 'curly_short', 'curly_long', 'pixie'
];

export const HAIR_COLORS = [
  { name: 'Blonde', value: 0xf4d03f },
  { name: 'Lt Brown', value: 0xa0522d },
  { name: 'Dk Brown', value: 0x5d4037 },
  { name: 'Black', value: 0x212121 },
  { name: 'Red', value: 0xc0392b },
  { name: 'Auburn', value: 0x8b4513 },
  { name: 'Gray', value: 0x9e9e9e },
  { name: 'Pink', value: 0xff69b4 },
  { name: 'Blue', value: 0x3498db },
  { name: 'Purple', value: 0x9b59b6 },
];

export const SKIN_TONES = [
  { name: 'Light', value: 0xfde0c8 },
  { name: 'Med Lt', value: 0xf4c5a1 },
  { name: 'Medium', value: 0xe8a87c },
  { name: 'Med Dk', value: 0xc47a4a },
  { name: 'Dark', value: 0x8d5524 },
];

export const CLOTHING_COLORS = [
  { name: 'Blue', value: 0x3498db },
  { name: 'Red', value: 0xe74c3c },
  { name: 'Green', value: 0x2ecc71 },
  { name: 'Yellow', value: 0xf1c40f },
  { name: 'Purple', value: 0x9b59b6 },
  { name: 'Orange', value: 0xe67e22 },
  { name: 'Pink', value: 0xff69b4 },
  { name: 'Teal', value: 0x1abc9c },
  { name: 'Gray', value: 0x95a5a6 },
  { name: 'White', value: 0xecf0f1 },
  { name: 'Black', value: 0x2c3e50 },
  { name: 'Lime', value: 0xadff2f },
];

export const ACCESSORIES = {
  dad: ['none', 'glasses_round', 'glasses_square', 'sunglasses', 'hat_cap', 'hat_beanie', 'hat_sun'],
  lillian: ['none', 'hair_bow', 'hair_clip', 'headband', 'sunglasses', 'hat_cap', 'hat_sun'],
};

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  CUSTOMIZE: 'CustomizeScene',
  HUB: 'HubScene',
  TENNIS: 'TennisScene',
  SOCCER: 'SoccerScene',
  MARBLE_RUN: 'MarbleRunScene',
  KEEPY_UPPY: 'KeepyUppyScene',
};

export const LOCATIONS = {
  HOME: 'home',
  PARK: 'park',
  TENNIS_COURT: 'tennis_court',
  SOCCER_FIELD: 'soccer_field',
  PLAYGROUND: 'playground',
};

export const WALK_SPEED = 80;
export const BIKE_SPEED = 150;
export const CAR_SPEED = 220;
export const WORLD_SIZE = 1280;
