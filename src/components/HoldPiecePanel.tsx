import type { PieceProto } from "../logic";

interface HoldPiecePanelProps {
  holdPiece: PieceProto | null;
  colors: Record<number, string>;
}

const PREVIEW_SIZE = 4;

export const HoldPiecePanel = ({ holdPiece, colors }: HoldPiecePanelProps) => {
  if (!holdPiece) {
    return (
      <div className="panel">
        <h2>홀드</h2>
        <div className="next-empty">없음</div>
      </div>
    );
  }

  const previewGrid: number[][] = Array.from({ length: PREVIEW_SIZE }, () =>
    Array(PREVIEW_SIZE).fill(0),
  );

  const shape = holdPiece.shape;
  const size = shape.length;

  const offsetX = Math.floor((PREVIEW_SIZE - size) / 2);
  const offsetY = Math.floor((PREVIEW_SIZE - size) / 2);

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
      <h2>홀드</h2>
      <div className="next-board">
        {previewGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`next-cell ${cell ? "filled" : ""}`}
              style={
                cell ? { backgroundColor: colors[holdPiece.type] } : undefined
              }
            />
          )),
        )}
      </div>
    </div>
  );
};
