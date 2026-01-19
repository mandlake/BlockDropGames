/**
 * src/logic/types.ts
 * 타입 정의
 */

export type Cell = number;
export type Board = Cell[][];
export type Shape = number[][];

export interface Piece {
  shape: Shape;
  x: number;
  y: number;
  type: number;
}

export interface PieceProto {
  type: number;
  shape: Shape;
}
