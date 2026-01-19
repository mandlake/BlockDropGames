// src/logic/utils/score.ts
// 클리어한 줄 수와 레벨에 따른 점수
export function getLineScore(lines: number, level: number): number {
  if (lines <= 0) return 0;

  const baseTable = [0, 100, 300, 500, 800];
  const base = baseTable[lines] ?? 0;
  return base * level;
}
