// src/logic/config.ts
export interface KeyBindings {
  left: string;
  right: string;
  softDrop: string;
  rotate: string;
  hardDrop: string; // e.g. " "
  hold: string;
}

export interface SpeedEntry {
  level: number;
  speed: number;
}

export interface GameConfig {
  cols: number;
  rows: number;

  // 이번 판 블록 프로토타입 개수
  shapeTypeCount: number;

  // 블록 생성 규칙
  minShapeSize: number; // N(NxN)
  maxShapeSize: number;

  minBlocksPerShape: number;
  maxBlocksPerShape: number;

  // 레벨 업 규칙
  linesPerLevel: number;

  speedTable: SpeedEntry[];
  keys: KeyBindings;
}

export const DEFAULT_SPEED_TABLE: SpeedEntry[] = [
  { level: 1, speed: 800 },
  { level: 2, speed: 700 },
  { level: 3, speed: 600 },
  { level: 4, speed: 500 },
  { level: 5, speed: 430 },
  { level: 6, speed: 380 },
  { level: 7, speed: 340 },
  { level: 8, speed: 300 },
  { level: 9, speed: 260 },
  { level: 10, speed: 230 },
  { level: 11, speed: 200 },
  { level: 12, speed: 180 },
  { level: 13, speed: 160 },
  { level: 14, speed: 140 },
  { level: 15, speed: 120 },
  { level: 16, speed: 110 },
  { level: 17, speed: 100 },
  { level: 18, speed: 90 },
  { level: 19, speed: 80 },
  { level: 20, speed: 70 },
];

export const DEFAULT_CONFIG: GameConfig = {
  cols: 14,
  rows: 20,

  shapeTypeCount: 10,

  minShapeSize: 3,
  maxShapeSize: 4,

  minBlocksPerShape: 3,
  maxBlocksPerShape: 7,

  linesPerLevel: 5,

  speedTable: DEFAULT_SPEED_TABLE,

  keys: {
    left: "ArrowLeft",
    right: "ArrowRight",
    softDrop: "ArrowDown",
    rotate: "ArrowUp",
    hardDrop: "Space", // Space
    hold: "KeyC",
  },
};
