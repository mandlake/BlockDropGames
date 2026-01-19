/**
 * src/logic/utils/board.ts
 * 유틸 함수
 */

import type { Board } from "../types";

// 빈 보드 생성
export function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}
