import { GameState, CharacterConfig } from '../types';

const SAVE_KEY = 'best_buds_save';

const defaultDad: CharacterConfig = {
  id: 'dad',
  skinTone: 0xf4c5a1,
  hairStyle: 'short_messy',
  hairColor: 0x212121,
  topColor: 0x607d8b,
  bottomColor: 0x2980b9,
  shoeColor: 0x2c3e50,
  accessory: 'none',
};

const defaultLillian: CharacterConfig = {
  id: 'lillian',
  skinTone: 0xfde0c8,
  hairStyle: 'long_braids',
  hairColor: 0xf4d03f,
  topColor: 0x2ecc71,
  bottomColor: 0xff69b4,
  shoeColor: 0xff69b4,
  accessory: 'hair_bow',
};

const defaultState: GameState = {
  dadConfig: defaultDad,
  lillianConfig: defaultLillian,
  activePlayer: 'dad',
  totalStars: 0,
  highScores: {},
  unlockedLocations: ['home', 'park', 'tennis_court', 'soccer_field', 'playground'],
  firstTime: true,
};

export class SaveManager {
  static load(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      return { ...JSON.parse(JSON.stringify(defaultState)), ...JSON.parse(raw) };
    } catch {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  static save(state: GameState): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  static updateScore(game: string, score: number): void {
    const state = this.load();
    if ((state.highScores[game] ?? 0) < score) {
      state.highScores[game] = score;
      this.save(state);
    }
  }

  static reset(): void { localStorage.removeItem(SAVE_KEY); }
  static getDefaults(): GameState { return JSON.parse(JSON.stringify(defaultState)); }
}
