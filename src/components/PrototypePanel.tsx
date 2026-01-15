// src/components/PrototypePanel.tsx

interface PrototypePanelProps {
  piecePrototypes: {
    type: number;
    shape: number[][];
  }[];
  colors: Record<number, string>;
}

export function PrototypePanel({
  piecePrototypes,
  colors,
}: PrototypePanelProps) {
  if (!piecePrototypes.length) {
    return (
      <div className="panel prototype-panel">
        <h2>이번 판 블록</h2>
        <div className="next-empty">생성 중...</div>
      </div>
    );
  }

  return (
    <div className="panel prototype-panel">
      <h2>이번 판 블록</h2>
      <div className="prototypes">
        {piecePrototypes.map((proto) => (
          <div key={proto.type} className="prototype-item">
            <div className="prototype-label">#{proto.type}</div>
            <div
              className="prototype-grid"
              style={{
                gridTemplateColumns: `repeat(${proto.shape.length}, 12px)`,
                gridTemplateRows: `repeat(${proto.shape.length}, 12px)`,
              }}
            >
              {proto.shape.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${proto.type}-${rowIndex}-${colIndex}`}
                    className="prototype-cell"
                    style={
                      cell ? { backgroundColor: colors[proto.type] } : undefined
                    }
                  ></div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
