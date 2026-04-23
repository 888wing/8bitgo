import type { SampleLevelDefinition, SampleLevelId } from "../content/sampleLevels";

export type SampleGameStatus = "playing" | "won" | "lost";
export type SampleAction =
  | { type: "moveTo"; x: number; y: number }
  | { type: "clearMove" };

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState extends Vec2 {
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
}

export interface GemState extends Vec2 {
  id: number;
  collected: boolean;
}

export interface EnemyState extends Vec2 {
  id: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  hitCooldownMs: number;
}

export interface ExitState extends Vec2 {
  active: boolean;
  radius: number;
}

export interface SampleGameState {
  levelId: SampleLevelId;
  levelTitle: string;
  levelHint: string;
  requiredGems: number;
  arenaTint: number;
  width: number;
  height: number;
  timeMs: number;
  status: SampleGameStatus;
  message: string;
  player: PlayerState;
  gems: GemState[];
  enemies: EnemyState[];
  exit: ExitState;
  moveTarget: Vec2 | null;
}

export function createInitialSampleState(level: SampleLevelDefinition): SampleGameState {
  const gems: GemState[] = [];
  const enemies: EnemyState[] = [];

  for (let index = 0; index < level.requiredGems; index += 1) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    gems.push({
      id: index + 1,
      x: 126 + column * 96,
      y: 250 + row * 86,
      collected: false
    });
  }

  for (let index = 0; index < level.enemyCount; index += 1) {
    const direction = index % 2 === 0 ? 1 : -1;
    enemies.push({
      id: index + 1,
      x: 130 + index * 90,
      y: 610 + (index % 2) * 90,
      vx: direction,
      vy: index % 3 === 0 ? 1 : -1,
      speed: 72 + index * 12,
      radius: 20,
      hitCooldownMs: 0
    });
  }

  return {
    levelId: level.id,
    levelTitle: level.title,
    levelHint: level.hint,
    requiredGems: level.requiredGems,
    arenaTint: level.arenaTint,
    width: 540,
    height: 960,
    timeMs: 0,
    status: "playing",
    message: level.hint,
    player: {
      x: 270,
      y: 780,
      hp: 3,
      maxHp: 3,
      speed: 215,
      radius: 18
    },
    gems,
    enemies,
    exit: {
      x: 270,
      y: 150,
      active: false,
      radius: 32
    },
    moveTarget: null
  };
}

export function collectedGemCount(state: SampleGameState): number {
  return state.gems.filter((gem) => gem.collected).length;
}

