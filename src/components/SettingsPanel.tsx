// src/components/SettingsPanel.tsx
import { useMemo, useState } from "react";
import type { GameConfig } from "../logic";

interface SettingsPanelProps {
  config: GameConfig;
  onApply: (next: GameConfig) => void;
}

export const SettingsPanel = ({ config, onApply }: SettingsPanelProps) => {
  const [draft, setDraft] = useState<GameConfig>(config);

  const isValid = useMemo(() => {
    if (draft.cols < 6 || draft.rows < 10) return false;
    if (draft.shapeTypeCount < 1 || draft.shapeTypeCount > 50) return false;

    if (draft.minShapeSize < 2) return false;
    if (draft.maxShapeSize < draft.minShapeSize) return false;

    const maxPossible = draft.maxShapeSize * draft.maxShapeSize;
    if (draft.minBlocksPerShape < 1) return false;
    if (draft.maxBlocksPerShape < draft.minBlocksPerShape) return false;
    if (draft.maxBlocksPerShape > maxPossible) return false;

    if (draft.linesPerLevel < 1 || draft.linesPerLevel > 20) return false;

    return true;
  }, [draft]);

  const setNum =
    (key: keyof GameConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      setDraft((prev) => ({ ...prev, [key]: v }));
    };

  const setKey =
    (key: keyof GameConfig["keys"]) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({
        ...prev,
        keys: { ...prev.keys, [key]: e.target.value },
      }));
    };

  return (
    <div className="panel">
      <h2>설정</h2>

      <div className="settings">
        <label>
          보드 가로(cols)
          <input type="number" value={draft.cols} onChange={setNum("cols")} />
        </label>

        <label>
          보드 세로(rows)
          <input type="number" value={draft.rows} onChange={setNum("rows")} />
        </label>

        <label>
          블록 종류 수(shapeTypeCount)
          <input
            type="number"
            value={draft.shapeTypeCount}
            onChange={setNum("shapeTypeCount")}
          />
        </label>

        <label>
          블록 크기 최소(minShapeSize)
          <input
            type="number"
            value={draft.minShapeSize}
            onChange={setNum("minShapeSize")}
          />
        </label>

        <label>
          블록 크기 최대(maxShapeSize)
          <input
            type="number"
            value={draft.maxShapeSize}
            onChange={setNum("maxShapeSize")}
          />
        </label>

        <label>
          블록 칸 수 최소(minBlocksPerShape)
          <input
            type="number"
            value={draft.minBlocksPerShape}
            onChange={setNum("minBlocksPerShape")}
          />
        </label>

        <label>
          블록 칸 수 최대(maxBlocksPerShape)
          <input
            type="number"
            value={draft.maxBlocksPerShape}
            onChange={setNum("maxBlocksPerShape")}
          />
        </label>

        <label>
          레벨업 기준(linesPerLevel)
          <input
            type="number"
            value={draft.linesPerLevel}
            onChange={setNum("linesPerLevel")}
          />
        </label>

        <div className="settings-keys">
          <div className="settings-subtitle">키 설정</div>

          <label>
            Left
            <input value={draft.keys.left} onChange={setKey("left")} />
          </label>
          <label>
            Right
            <input value={draft.keys.right} onChange={setKey("right")} />
          </label>
          <label>
            Soft Drop
            <input value={draft.keys.softDrop} onChange={setKey("softDrop")} />
          </label>
          <label>
            Rotate
            <input value={draft.keys.rotate} onChange={setKey("rotate")} />
          </label>
          <label>
            Hard Drop
            <input value={draft.keys.hardDrop} onChange={setKey("hardDrop")} />
          </label>
        </div>

        <button
          className="btn"
          disabled={!isValid}
          onClick={() => onApply(draft)}
        >
          적용 후 재시작
        </button>

        {!isValid && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#ff6b6b" }}>
            설정값 범위를 확인하세요.
          </div>
        )}
      </div>
    </div>
  );
};
