/**
 * src/logic/utils/piece.ts
 */
import type { Piece, PieceProto } from "../types";

/**
 * 9. 프로토타입 리스트에서 랜덤으로 하나 뽑아 Piece 생성
 *    - proos가 비어 있으면 임시 shape를 하나 생성해서 사용
 *    - x는 cols 기준 중앙 스폰
 */
export function createRandomPiece(protos: PieceProto[], cols: number): Piece {
  const list = protos.length > 0 ? protos : [{ type: 1, shape: [[1]] }];
  const proto = list[Math.floor(Math.random() * list.length)];

  const size = proto.shape.length;
  const spawnX = Math.floor(cols / 2) - Math.floor(size / 2);

  return {
    shape: proto.shape.map((row) => [...row]),
    x: spawnX,
    y: 0,
    type: proto.type,
  };
}
