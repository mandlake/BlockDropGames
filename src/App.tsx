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

function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

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

  // 첫 실행 시 게임 시작
  useEffect(() => {
    resetGame(DEFAULT_CONFIG);
  }, [resetGame]);

  // 자동 낙하
  const tick = useCallback(() => {
    if (gameOver || !piecePrototypes.length) return;

    setCurrentPiece((prev) => {
      if (!prev) return prev;

      // 한 칸 내려갈 수 있으면 이동
      if (!collide(board, prev, config.cols, config.rows, 0, 1)) {
        return { ...prev, y: prev.y + 1 };
      }

      // 더 이상 못 내려가면 보드에 고정
      const { shape, x, y, type } = prev;
      const newBoard = board.map((row) => [...row]);

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const boardY = y + r;
          const boardX = x + c;
          if (boardY < 0) continue;
          newBoard[boardY][boardX] = type;
        }
      }

      const { board: clearedBoard, lines } = clearLines(
        newBoard,
        config.cols,
        config.rows
      );
      if (lines > 0) {
        setScore((s) => s + getLineScore(lines, level));
        setLinesCleared((prevTotal) => prevTotal + lines);
        setShowLevelUp(true);
      }
      setBoard(clearedBoard);

      // 다음 조각 스폰
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
    gameOver,
    level,
    nextPiece,
    piecePrototypes,
  ]);

  // 자동 낙하 interval
  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, currentSpeed);
    return () => window.clearInterval(id);
  }, [tick, gameOver, currentSpeed]);

  // 키보드 입력 (config.keys 반영)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
              const boardY = y + r;
              const boardX = x + c;
              if (boardY < 0) continue;
              newBoard[boardY][boardX] = type;
            }
          }

          const { board: clearedBoard, lines } = clearLines(
            newBoard,
            config.cols,
            config.rows
          );
          if (lines > 0) {
            setScore((s) => s + getLineScore(lines, level));
            setLinesCleared((prevTotal) => prevTotal + lines);
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
    board,
    config,
    currentPiece,
    gameOver,
    level,
    nextPiece,
    piecePrototypes,
  ]);

  // 레벨업 애니메이션 숨김
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
  }, [board, currentPiece, config.rows, config.cols]);

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
        {/* 1: 이번 판 블록 목록 + 설정 */}
        <div className="left">
          <PrototypePanel piecePrototypes={piecePrototypes} colors={colors} />
          <SettingsPanel
            config={config}
            onApply={(nextCfg) => {
              setConfig(nextCfg);
              resetGame(nextCfg);
            }}
          />
        </div>

        {/* 2: 메인 게임 보드 */}
        <GameBoard
          board={displayBoard}
          cols={config.cols}
          rows={config.rows}
          colors={colors}
          ghostPiece={ghostPiece}
        />

        {/* 3: 점수 / 다음 블록 / 조작법 패널 */}
        <div className="side">
          <ScorePanel
            score={score}
            level={level}
            gameOver={gameOver}
            onReset={resetGame}
          />

          <NextPiecePanel nextPiece={nextPiece} colors={colors} />

          <ControlsPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
