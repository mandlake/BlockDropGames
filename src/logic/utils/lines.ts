// src/logic/utils/lines.ts
import type { Board } from "../types";

// 라인 클리어 처리
export function clearLines(
  board: Board,
  cols: number,
  rows: number
): { board: Board; lines: number } {
  let lines = 0;
  const newBoard = board.map((row) => [...row]);

  for (let row = rows - 1; row >= 0; row--) {
    if (newBoard[row].every((cell) => cell !== 0)) {
      newBoard.splice(row, 1);
      newBoard.unshift(Array(cols).fill(0));
      lines++;
      row++;
    }
  }

  return { board: newBoard, lines };
}
