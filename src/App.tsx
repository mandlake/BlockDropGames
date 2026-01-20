// src/App.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles/App.css";

import { GameBoard } from "./components/GameBoard";
import { ScorePanel } from "./components/ScorePanel";
import { NextPiecePanel } from "./components/NextPiecePanel";
import { HoldPiecePanel } from "./components/HoldPiecePanel";
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

/** 스폰 좌표로 piece를 리셋(NextPiece가 이전 좌표를 들고 있어도 안전) */
function resetPieceSpawn(piece: Piece, cols: number): Piece {
  const size = piece.shape.length;
  const spawnX = Math.floor(cols / 2) - Math.floor(size / 2);
  return { ...piece, x: spawnX, y: 0 };
}

/** 현재 piece를 "프로토타입" 형태로 뽑아 Hold에 저장하기 위함 */
function toProto(piece: Piece): PieceProto {
  return { type: piece.type, shape: piece.shape.map((row) => [...row]) };
}

/** proto로부터 "스폰 가능한 Piece" 생성 */
function spawnFromProto(proto: PieceProto, cols: number): Piece {
  // createRandomPiece는 proto 배열 중 하나를 랜덤 선택하는데,
  // 여기서는 단일 proto로 강제 선택되도록 배열 길이 1로 넘김.
  const spawned = createRandomPiece([proto], cols);
  return resetPieceSpawn(spawned, cols);
}

export default function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  // UI state
  const [paused, setPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // game state
  const [board, setBoard] = useState<Board>(() =>
    createEmptyBoard(DEFAULT_CONFIG.rows, DEFAULT_CONFIG.cols),
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [linesCleared, setLinesCleared] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // prototypes + colors
  const [colors, setColors] = useState<Colors>({});
  const [piecePrototypes, setPiecePrototypes] = useState<PieceProto[]>([]);

  // HOLD (연속 스왑 허용: canHold 없음)
  const [holdPiece, setHoldPiece] = useState<PieceProto | null>(null);

  // 최신 값 참조용(stale 방지)
  const boardRef = useRef(board);
  const currentPieceRef = useRef(currentPiece);
  const nextPieceRef = useRef(nextPiece);
  const protosRef = useRef(piecePrototypes);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    currentPieceRef.current = currentPiece;
  }, [currentPiece]);
  useEffect(() => {
    nextPieceRef.current = nextPiece;
  }, [nextPiece]);
  useEffect(() => {
    protosRef.current = piecePrototypes;
  }, [piecePrototypes]);

  const level = useMemo(() => {
    return Math.floor(linesCleared / config.linesPerLevel) + 1;
  }, [linesCleared, config.linesPerLevel]);

  const currentSpeed = useMemo(() => {
    const entry = config.speedTable.find((e) => e.level === level);
    return entry
      ? entry.speed
      : config.speedTable[config.speedTable.length - 1].speed;
  }, [level, config.speedTable]);

  const hardLockToBoard = useCallback(
    (piece: Piece, baseBoard: Board): Board => {
      const { shape, x, y, type } = piece;
      const newBoard = baseBoard.map((row) => [...row]);

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const by = y + r;
          const bx = x + c;
          if (by < 0) continue;
          newBoard[by][bx] = type;
        }
      }
      return newBoard;
    },
    [],
  );

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setPaused(false);
  }, []);

  /**
   * 다음 조각 스폰 + next 큐 갱신
   * - nextPiece가 있으면 그것을 스폰으로 사용
   * - 없으면 랜덤 생성
   * - 스폰 실패(충돌)면 게임오버
   */
  const spawnNextAndQueue = useCallback(
    (baseBoard: Board): Piece | null => {
      const protos = protosRef.current;
      if (!protos.length) return null;

      const spawnRaw =
        nextPieceRef.current ?? createRandomPiece(protos, config.cols);

      const spawn = resetPieceSpawn(spawnRaw, config.cols);
      const queued = createRandomPiece(protos, config.cols);

      if (collide(baseBoard, spawn, config.cols, config.rows, 0, 0)) {
        setGameOver(true);
        setCurrentPiece(null);
        setNextPiece(null);
        return null;
      }

      setNextPiece(queued);
      return spawn;
    },
    [config.cols, config.rows],
  );

  const finalizeLock = useCallback(
    (lockedBoard: Board) => {
      const { board: clearedBoard, lines } = clearLines(
        lockedBoard,
        config.cols,
        config.rows,
      );

      if (lines > 0) {
        setScore((s) => s + getLineScore(lines, level));
        setLinesCleared((t) => t + lines);
        setShowLevelUp(true);
      }

      setBoard(clearedBoard);

      const spawned = spawnNextAndQueue(clearedBoard);
      setCurrentPiece(spawned);
    },
    [config.cols, config.rows, level, spawnNextAndQueue],
  );

  /** piece를 현재 위치(또는 고스트 위치)로 확정 고정 + 후처리 */
  const lockAndFinalize = useCallback(
    (pieceToLock: Piece) => {
      const locked = hardLockToBoard(pieceToLock, boardRef.current);
      finalizeLock(locked);
    },
    [hardLockToBoard, finalizeLock],
  );

  const resetGame = useCallback(
    (nextConfig?: GameConfig) => {
      const cfg = nextConfig ?? config;

      const empty = createEmptyBoard(cfg.rows, cfg.cols);
      const protos = generateShapePrototypes(cfg);

      const types = protos.map((p) => p.type);
      const palette = generateColorPalette(types);

      const first = resetPieceSpawn(
        createRandomPiece(protos, cfg.cols),
        cfg.cols,
      );
      const second = createRandomPiece(protos, cfg.cols);

      // prototypes/colors
      setPiecePrototypes(protos);
      setColors(palette);

      // game state 초기화
      setBoard(empty);
      setScore(0);
      setGameOver(false);
      setLinesCleared(0);
      setShowLevelUp(false);

      // HOLD 초기화
      setHoldPiece(null);

      // spawn
      if (collide(empty, first, cfg.cols, cfg.rows, 0, 0)) {
        setGameOver(true);
        setCurrentPiece(null);
        setNextPiece(null);
      } else {
        setCurrentPiece(first);
        setNextPiece(second);
      }
    },
    [config],
  );

  useEffect(() => {
    resetGame(DEFAULT_CONFIG);
  }, [resetGame]);

  const tick = useCallback(() => {
    if (paused) return;
    if (gameOver || !piecePrototypes.length) return;

    setCurrentPiece((prev) => {
      if (!prev) return prev;

      if (!collide(boardRef.current, prev, config.cols, config.rows, 0, 1)) {
        return { ...prev, y: prev.y + 1 };
      }

      lockAndFinalize(prev);
      return prev;
    });
  }, [
    paused,
    gameOver,
    piecePrototypes.length,
    config.cols,
    config.rows,
    lockAndFinalize,
  ]);

  /**
   * HOLD (연속 스왑 허용)
   * - hold 비어있음: 현재를 hold에 넣고 next를 현재로 스폰
   * - hold 있음: hold <-> 현재 스왑
   */
  const doHold = useCallback(() => {
    if (paused || isSettingsOpen || gameOver) return;

    const cur = currentPieceRef.current;
    if (!cur) return;

    const curProto = toProto(cur);

    setHoldPiece((prevHold) => {
      // 홀드 비어있음
      if (!prevHold) {
        const spawned = spawnNextAndQueue(boardRef.current);
        if (!spawned) return prevHold;

        setCurrentPiece(spawned);
        return curProto;
      }

      // 홀드 있음: 스왑
      const swapped = spawnFromProto(prevHold, config.cols);

      if (collide(boardRef.current, swapped, config.cols, config.rows, 0, 0)) {
        return prevHold;
      }

      setCurrentPiece(swapped);
      return curProto;
    });
  }, [
    paused,
    isSettingsOpen,
    gameOver,
    spawnNextAndQueue,
    config.cols,
    config.rows,
  ]);

  // game loop
  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, currentSpeed);
    return () => window.clearInterval(id);
  }, [tick, gameOver, currentSpeed]);

  // keyboard control (e.code 기반 통일)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC
      if (e.code === "Escape") {
        if (isSettingsOpen) closeSettings();
        else setPaused((p) => !p);
        return;
      }

      if (paused || isSettingsOpen) return;

      const cur = currentPieceRef.current;
      if (gameOver || !cur || !protosRef.current.length) return;

      const k = config.keys;

      // HOLD
      if (e.code === k.hold) {
        e.preventDefault();
        doHold();
        return;
      }

      // LEFT / RIGHT
      if (e.code === k.left || e.code === k.right) {
        const dir = e.code === k.left ? -1 : 1;
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(boardRef.current, prev, config.cols, config.rows, dir, 0))
            return prev;
          return { ...prev, x: prev.x + dir };
        });
        return;
      }

      // SOFT DROP
      if (e.code === k.softDrop) {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(boardRef.current, prev, config.cols, config.rows, 0, 1))
            return prev;
          return { ...prev, y: prev.y + 1 };
        });
        return;
      }

      // ROTATE
      if (e.code === k.rotate) {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          const rotated = rotateMatrix(prev.shape);
          if (
            collide(
              boardRef.current,
              { ...prev, shape: rotated },
              config.cols,
              config.rows,
              0,
              0,
              rotated,
            )
          ) {
            return prev;
          }
          return { ...prev, shape: rotated };
        });
        return;
      }

      // HARD DROP
      if (e.code === k.hardDrop) {
        e.preventDefault();

        setCurrentPiece((prev) => {
          if (!prev) return prev;

          let ghost: Piece = { ...prev };
          while (
            !collide(boardRef.current, ghost, config.cols, config.rows, 0, 1)
          ) {
            ghost = { ...ghost, y: ghost.y + 1 };
          }

          lockAndFinalize(ghost);
          return prev;
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
    config,
    doHold,
    lockAndFinalize,
    config.cols,
    config.rows,
  ]);

  // level up overlay auto hide
  useEffect(() => {
    if (!showLevelUp) return;
    const id = window.setTimeout(() => setShowLevelUp(false), 800);
    return () => window.clearTimeout(id);
  }, [showLevelUp]);

  // board + current piece overlay
  const displayBoard: Board = useMemo(() => {
    const clone = board.map((row) => [...row]);
    const cur = currentPiece;
    if (!cur) return clone;

    const { shape, x, y, type } = cur;

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

  // ghost piece calc
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
        <PrototypePanel piecePrototypes={piecePrototypes} colors={colors} />

        <div className="board-wrap">
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

        <div className="side">
          <ScorePanel
            score={score}
            level={level}
            gameOver={gameOver}
            onReset={() => resetGame()}
          />

          <NextPiecePanel nextPiece={nextPiece} colors={colors} />
          <HoldPiecePanel holdPiece={holdPiece} colors={colors} />
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
