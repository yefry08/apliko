import * as THREE from "three";

/**
 * The logic of ApliKo's Rubik's cube, without React or rendering, so it can be tested on its own
 * (components/three/rubik-scene.tsx draws it). Moves use standard notation (U D R L F B, ' for
 * counter-clockwise); a move turns one layer 90° about a world axis.
 */

export type Axis = "x" | "y" | "z";
export interface Move {
  axis: Axis;
  /** Which slice along the axis: the two outer faces or, when turned by dragging, the middle one. */
  layer: -1 | 0 | 1;
  /** Sign of the angle about the positive axis: -1 is clockwise seen from the + side. */
  dir: 1 | -1;
}

export const FACES = {
  U: { axis: "y", layer: 1, dir: -1 },
  D: { axis: "y", layer: -1, dir: 1 },
  R: { axis: "x", layer: 1, dir: -1 },
  L: { axis: "x", layer: -1, dir: 1 },
  F: { axis: "z", layer: 1, dir: -1 },
  B: { axis: "z", layer: -1, dir: 1 },
} as const satisfies Record<string, Move>;
export type Face = keyof typeof FACES;

const AXES: Axis[] = ["x", "y", "z"];

/** The axis a unit vector (one of ±x, ±y, ±z) points along, and its sign. */
export function axisOf(v: THREE.Vector3): { axis: Axis; sign: 1 | -1 } {
  const parts = [v.x, v.y, v.z];
  const i = parts.reduce((best, n, k) => (Math.abs(n) > Math.abs(parts[best]) ? k : best), 0);
  return { axis: AXES[i], sign: parts[i] < 0 ? -1 : 1 };
}

/**
 * The turn a drag asks for. `normal` is the outward face that was grabbed, `along` the direction on that face the
 * pointer moved (both axis-aligned, in cube coordinates) and `point` where it was grabbed. The layer turns about
 * normal × along, so the grabbed sticker travels the way the pointer went.
 */
export function moveFromDrag(normal: THREE.Vector3, along: THREE.Vector3, point: THREE.Vector3): Move | null {
  const turnAxis = new THREE.Vector3().crossVectors(normal, along);
  if (turnAxis.lengthSq() < 0.5) return null;
  const { axis, sign } = axisOf(turnAxis);
  const layer = Math.max(-1, Math.min(1, Math.round(point[axis]))) as -1 | 0 | 1;
  return { axis, layer, dir: sign };
}


// ApliKo's palette on the six faces.
const STICKERS: { normal: [number, number, number]; color: string }[] = [
  { normal: [1, 0, 0], color: "#FF7869" },
  { normal: [-1, 0, 0], color: "#FFA94D" },
  { normal: [0, 1, 0], color: "#FFFFFF" },
  { normal: [0, -1, 0], color: "#FFE066" },
  { normal: [0, 0, 1], color: "#5EEAD4" },
  { normal: [0, 0, -1], color: "#3054DE" },
];

const AXIS: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

export interface Piece {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  stickers: { normal: THREE.Vector3; color: string }[];
}

export function buildPieces(): Piece[] {
  const pieces: Piece[] = [];
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1]) {
        const home = new THREE.Vector3(x, y, z);
        pieces.push({
          home,
          pos: home.clone(),
          quat: new THREE.Quaternion(),
          // A piece shows a sticker on each side that faces out of the cube.
          stickers: STICKERS.filter((s) => s.normal.some((n, i) => n !== 0 && n === [x, y, z][i])).map((s) => ({
            normal: new THREE.Vector3(...s.normal),
            color: s.color,
          })),
        });
      }
  return pieces;
}

/** Solved when every sticker that points the same way has the same colour. */
export function isSolved(pieces: Piece[]) {
  const seen = new Map<string, string>();
  for (const p of pieces)
    for (const s of p.stickers) {
      const n = s.normal.clone().applyQuaternion(p.quat);
      const key = `${Math.round(n.x)},${Math.round(n.y)},${Math.round(n.z)}`;
      const color = seen.get(key);
      if (color && color !== s.color) return false;
      seen.set(key, s.color);
    }
  return true;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface Turn {
  move: Move;
  ms: number;
  counts: boolean;
}

/**
 * The cube's mutable state, outside React: the pieces, the queue of pending turns and the turn in progress.
 * The scene calls step() every frame; the buttons call push() and reset(). React only renders the meshes once.
 */
export class CubeController {
  readonly pieces = buildPieces();
  readonly groups: (THREE.Group | null)[] = [];
  private queue: Turn[] = [];
  private active: { turn: Turn; ids: number[]; start: number } | null = null;
  private readonly q = new THREE.Quaternion();

  push(turn: Turn) {
    this.queue.push(turn);
  }

  reset() {
    this.queue = [];
    this.active = null;
    this.pieces.forEach((p, i) => {
      p.pos.copy(p.home);
      p.quat.identity();
      this.groups[i]?.position.copy(p.home);
      this.groups[i]?.quaternion.identity();
    });
  }

  solved() {
    return isSolved(this.pieces);
  }

  /** Advances the turn in progress; returns it once it finishes, with whether the queue is now empty. */
  step(nowMs: number): { turn: Turn; idle: boolean } | null {
    if (!this.active && this.queue.length) {
      const turn = this.queue.shift()!;
      const ids = this.pieces.flatMap((p, i) => (Math.round(p.pos[turn.move.axis]) === turn.move.layer ? [i] : []));
      this.active = { turn, ids, start: nowMs };
    }
    const a = this.active;
    if (!a) return null;
    const t = Math.min(1, (nowMs - a.start) / a.turn.ms);
    this.q.setFromAxisAngle(AXIS[a.turn.move.axis], (a.turn.move.dir * Math.PI * ease(t)) / 2);
    for (const i of a.ids) {
      const g = this.groups[i];
      if (!g) continue;
      g.position.copy(this.pieces[i].pos).applyQuaternion(this.q);
      g.quaternion.copy(this.q).multiply(this.pieces[i].quat);
    }
    if (t < 1) return null;
    // Bake the turn into the pieces, snapping positions to the grid so rounding never drifts.
    for (const i of a.ids) {
      this.pieces[i].pos.applyQuaternion(this.q).round();
      this.pieces[i].quat.premultiply(this.q).normalize();
    }
    this.active = null;
    return { turn: a.turn, idle: this.queue.length === 0 };
  }
}
