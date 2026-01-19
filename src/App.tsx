// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles/App.css";

import { GameBoard } from "./components/GameBoard";
import { ScorePanel } from "./components/ScorePanel";
import { NextPiecePanel } from "./components/NextPiecePanel";
import { ControlsPanel } from "./components/ControlsPanel";
import { LevelUpOverlay } from "./components/LevelUpOverlay";
import { PrototypePanel } from "./components/PrototypePanel";
import { SettingsPanel } from "./components/SettingsPanel";

import {
  DEFAULT_CONFIG,
  createEmptyBoard,
  rotateMatrix,
  clearLines,
  collide,
  getLineScore,
  generateShapePrototypes,
  createRandomPiece,
  type Board,
  type Piece,
  type PieceProto,
  type GameConfig,
} from "./logic";

type Colors = Record<number, string>;

function generateColorPalette(types: number[]): Colors {
  const palette: Colors = {};
  const usedHues: number[] = [];

  for (const type of types) {
    let hue: number;
    let attempts = 0;

    do {
      hue = Math.floor(Math.random() * 360);
      attempts++;
    } while (usedHues.some((h) => Math.abs(h - hue) < 25) && attempts < 10);

    usedHues.push(hue);

    const saturation = 80;
    const lightness = 55;
    palette[type] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  return palette;
}

export default function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [paused, setPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [board, setBoard] = useState<Board>(() =>
    createEmptyBoard(DEFAULT_CONFIG.rows, DEFAULT_CONFIG.cols)
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [linesCleared, setLinesCleared] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [colors, setColors] = useState<Colors>({});
  const [piecePrototypes, setPiecePrototypes] = useState<PieceProto[]>([]);

  const level = useMemo(() => {
    return Math.floor(linesCleared / config.linesPerLevel) + 1;
  }, [linesCleared, config.linesPerLevel]);

  const currentSpeed = useMemo(() => {
    const entry = config.speedTable.find((e) => e.level === level);
    return entry
      ? entry.speed
      : config.speedTable[config.speedTable.length - 1].speed;
  }, [level, config.speedTable]);

  const resetGame = useCallback(
    (nextConfig?: GameConfig) => {
      const cfg = nextConfig ?? config;

      const empty = createEmptyBoard(cfg.rows, cfg.cols);

      const protos = generateShapePrototypes(cfg);
      setPiecePrototypes(protos);

      const types = protos.map((p) => p.type);
      setColors(generateColorPalette(types));

      const first = createRandomPiece(protos, cfg.cols);
      const second = createRandomPiece(protos, cfg.cols);

      setBoard(empty);
      setScore(0);
      setGameOver(false);
      setLinesCleared(0);
      setShowLevelUp(false);

      if (collide(empty, first, cfg.cols, cfg.rows, 0, 0)) {
        setGameOver(true);
        setCurrentPiece(null);
        setNextPiece(null);
      } else {
        setCurrentPiece(first);
        setNextPiece(second);
      }
    },
    [config]
  );

  useEffect(() => {
    resetGame(DEFAULT_CONFIG);
  }, [resetGame]);

  const tick = useCallback(() => {
    if (paused) return;
    if (gameOver || !piecePrototypes.length) return;

    setCurrentPiece((prev) => {
      if (!prev) return prev;

      if (!collide(board, prev, config.cols, config.rows, 0, 1)) {
        return { ...prev, y: prev.y + 1 };
      }

      const { shape, x, y, type } = prev;
      const newBoard = board.map((row) => [...row]);

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const by = y + r;
          const bx = x + c;
          if (by < 0) continue;
          newBoard[by][bx] = type;
        }
      }

      const { board: clearedBoard, lines } = clearLines(
        newBoard,
        config.cols,
        config.rows
      );

      if (lines > 0) {
        setScore((s) => s + getLineScore(lines, level));
        setLinesCleared((t) => t + lines);
        setShowLevelUp(true);
      }

      setBoard(clearedBoard);

      const spawn =
        nextPiece ?? createRandomPiece(piecePrototypes, config.cols);
      const queued = createRandomPiece(piecePrototypes, config.cols);

      if (collide(clearedBoard, spawn, config.cols, config.rows, 0, 0)) {
        setGameOver(true);
        setNextPiece(null);
        return null;
      }

      setNextPiece(queued);
      return spawn;
    });
  }, [
    board,
    config.cols,
    config.rows,
    paused,
    gameOver,
    level,
    nextPiece,
    piecePrototypes,
  ]);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, currentSpeed);
    return () => window.clearInterval(id);
  }, [tick, gameOver, paused, currentSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ✅ ESC: 설정 모달이 열려 있으면 닫고, 아니면 일시정지 토글
      if (e.key === "Escape") {
        if (isSettingsOpen) {
          closeSettings();
        } else {
          setPaused((p) => !p);
        }
        return;
      }

      // ✅ pause 중이거나 설정 모달 중이면 조작 불가
      if (paused || isSettingsOpen) return;

      if (gameOver || !currentPiece || !piecePrototypes.length) return;

      const k = config.keys;

      if (e.key === k.left || e.key === k.right) {
        const dir = e.key === k.left ? -1 : 1;
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(board, prev, config.cols, config.rows, dir, 0))
            return prev;
          return { ...prev, x: prev.x + dir };
        });
      } else if (e.key === k.softDrop) {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(board, prev, config.cols, config.rows, 0, 1)) return prev;
          return { ...prev, y: prev.y + 1 };
        });
      } else if (e.key === k.rotate) {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          const rotated = rotateMatrix(prev.shape);
          if (
            collide(
              board,
              { ...prev, shape: rotated },
              config.cols,
              config.rows,
              0,
              0,
              rotated
            )
          ) {
            return prev;
          }
          return { ...prev, shape: rotated };
        });
      } else if (e.key === k.hardDrop) {
        e.preventDefault();

        setCurrentPiece((prev) => {
          if (!prev) return prev;

          let ghost: Piece = { ...prev };
          while (!collide(board, ghost, config.cols, config.rows, 0, 1)) {
            ghost = { ...ghost, y: ghost.y + 1 };
          }

          const { shape, x, y, type } = ghost;
          const newBoard = board.map((row) => [...row]);

          for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
              if (!shape[r][c]) continue;
              const by = y + r;
              const bx = x + c;
              if (by < 0) continue;
              newBoard[by][bx] = type;
            }
          }

          const { board: clearedBoard, lines } = clearLines(
            newBoard,
            config.cols,
            config.rows
          );

          if (lines > 0) {
            setScore((s) => s + getLineScore(lines, level));
            setLinesCleared((t) => t + lines);
            setShowLevelUp(true);
          }

          setBoard(clearedBoard);

          const spawn =
            nextPiece ?? createRandomPiece(piecePrototypes, config.cols);
          const queued = createRandomPiece(piecePrototypes, config.cols);

          if (collide(clearedBoard, spawn, config.cols, config.rows, 0, 0)) {
            setGameOver(true);
            setNextPiece(null);
            return null;
          }

          setNextPiece(queued);
          return spawn;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    paused,
    isSettingsOpen,
    closeSettings,
    gameOver,
    currentPiece,
    piecePrototypes,
    board,
    config,
    level,
    nextPiece,
  ]);

  useEffect(() => {
    if (!showLevelUp) return;
    const id = window.setTimeout(() => setShowLevelUp(false), 800);
    return () => window.clearTimeout(id);
  }, [showLevelUp]);

  const displayBoard: Board = useMemo(() => {
    const clone = board.map((row) => [...row]);
    if (!currentPiece) return clone;

    const { shape, x, y, type } = currentPiece;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;

        const by = y + r;
        const bx = x + c;
        if (by < 0 || by >= config.rows || bx < 0 || bx >= config.cols)
          continue;
        clone[by][bx] = type;
      }
    }

    return clone;
  }, [board, currentPiece, config.cols, config.rows]);

  const ghostPiece: Piece | null = useMemo(() => {
    if (!currentPiece) return null;

    let ghost: Piece = { ...currentPiece };
    while (!collide(board, ghost, config.cols, config.rows, 0, 1)) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }, [board, currentPiece, config.cols, config.rows]);

  return (
    <div className="app">
      {showLevelUp && <LevelUpOverlay level={level} />}

      <div className="game">
        {/* 1: 이번 판 블록 목록 패널 */}
        <PrototypePanel piecePrototypes={piecePrototypes} colors={colors} />

        {/* 2: 메인 게임 보드 */}
        <div className="board-wrap">
          {/* 설정 버튼 (보드 위) */}
          <button
            className="settings-btn"
            onClick={() => {
              setPaused(true);
              setIsSettingsOpen(true);
            }}
          >
            설정
          </button>

          <GameBoard
            board={displayBoard}
            cols={config.cols}
            rows={config.rows}
            colors={colors}
            ghostPiece={ghostPiece}
          />
        </div>

        {/* 3: 점수 / 다음 블록 / 조작법 패널 */}
        <div className="side">
          <ScorePanel
            score={score}
            level={level}
            gameOver={gameOver}
            onReset={() => resetGame()}
          />

          <NextPiecePanel nextPiece={nextPiece} colors={colors} />

          <ControlsPanel />
        </div>
      </div>

      {paused && !isSettingsOpen && (
        <div className="pause-overlay">
          <div className="pause-text">PAUSED</div>
        </div>
      )}

      {gameOver && (
        <div className="gameover-overlay">
          <div className="gameover-box">
            <div className="gameover-title">GAME OVER</div>

            <div className="gameover-stats">
              <div className="stat-row">
                <span className="stat-label">최종 점수</span>
                <span className="stat-value">{score}</span>
              </div>

              <div className="stat-row">
                <span className="stat-label">도달 레벨</span>
                <span className="stat-value">{level}</span>
              </div>

              <div className="stat-row">
                <span className="stat-label">제거한 줄 수</span>
                <span className="stat-value">{linesCleared}</span>
              </div>
            </div>

            <div className="gameover-actions">
              <button className="btn" onClick={() => resetGame()}>
                다시 시작
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setPaused(true);
                  setIsSettingsOpen(true);
                }}
              >
                설정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 설정 모달 */}
      {isSettingsOpen && (
        <div className="modal-backdrop" onMouseDown={closeSettings}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">설정</div>
              <button className="modal-close" onClick={closeSettings}>
                ✕
              </button>
            </div>

            <SettingsPanel
              config={config}
              onApply={(nextCfg) => {
                setConfig(nextCfg);
                resetGame(nextCfg);
                closeSettings();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
