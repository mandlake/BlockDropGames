// src/logic/index.ts
export * from "./types";
export * from "./config";

export { createEmptyBoard } from "./utils/board";
export { rotateMatrix } from "./utils/rotation";
export { collide } from "./utils/collision";
export { clearLines } from "./utils/lines";
export { getLineScore } from "./utils/score";
export { generateShapePrototypes } from "./utils/shapeGenerator";
export { createRandomPiece } from "./utils/piece";
