export interface CharacterConfig {
  id: 'dad' | 'lillian';
  skinTone: number;
  hairStyle: string;
  hairColor: number;
  topColor: number;
  bottomColor: number;
  shoeColor: number;
  accessory: string;
}

export interface GameState {
  dadConfig: CharacterConfig;
  lillianConfig: CharacterConfig;
  activePlayer: 'dad' | 'lillian';
  totalStars: number;
  highScores: Record<string, number>;
  unlockedLocations: string[];
  firstTime: boolean;
}

export type TransportMode = 'walk' | 'bike' | 'car';
