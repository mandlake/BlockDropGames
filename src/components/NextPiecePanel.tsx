// src/components/NextPiecePanel.tsx
import type { Piece } from "../logic";

interface NextPiecePanelProps {
  nextPiece: Piece | null;
  colors: Record<number, string>;
}

const PREVIEW_SIZE = 4; // 4x4 고정 미리보기 보드

export const NextPiecePanel = ({ nextPiece, colors }: NextPiecePanelProps) => {
  if (!nextPiece) {
    return (
      <div className="panel">
        <h2>다음 블록</h2>
        <div className="next-empty">없음</div>
      </div>
    );
  }

  // 4x4 미리보기용 보드 생성
  const previewGrid: number[][] = Array.from({ length: PREVIEW_SIZE }, () =>
    Array(PREVIEW_SIZE).fill(0)
  );

  const shape = nextPiece.shape;
  const size = shape.length; // 3 또는 4 (N x N)

  // 가운데 정렬용 오프셋
  const offsetX = Math.floor((PREVIEW_SIZE - size) / 2);
  const offsetY = Math.floor((PREVIEW_SIZE - size) / 2);

  // shape 내용을 4x4 보드 가운데에 복사
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!shape[y][x]) continue;

      const py = offsetY + y;
      const px = offsetX + x;

      if (py < 0 || py >= PREVIEW_SIZE || px < 0 || px >= PREVIEW_SIZE)
        continue;
      previewGrid[py][px] = 1;
    }
  }

  return (
    <div className="panel">
      <h2>다음 블록</h2>
      <div className="next-board">
        {previewGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`next-cell ${cell ? "filled" : ""}`}
              style={
                cell ? { backgroundColor: colors[nextPiece.type] } : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
