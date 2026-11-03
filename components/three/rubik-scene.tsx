"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useCallback, useState } from "react";
import * as THREE from "three";

/**
 * A playable 3×3 Rubik's cube: 27 pieces, each a group whose position and rotation live in refs and change
 * inside useFrame, so a turn never re-renders React. Moves use standard notation (U D R L F B, ' for
 * counter-clockwise); a move turns one layer 90° about a world axis.
 */

type Axis = "x" | "y" | "z";
interface Move {
  axis: Axis;
  layer: -1 | 1;
  /** Sign of the angle about the positive axis: -1 is clockwise seen from the + side. */
  dir: 1 | -1;
}

const FACES = {
  U: { axis: "y", layer: 1, dir: -1 },
  D: { axis: "y", layer: -1, dir: 1 },
  R: { axis: "x", layer: 1, dir: -1 },
  L: { axis: "x", layer: -1, dir: 1 },
  F: { axis: "z", layer: 1, dir: -1 },
  B: { axis: "z", layer: -1, dir: 1 },
} as const satisfies Record<string, Move>;
type Face = keyof typeof FACES;

const FACE_NAMES: Record<Face, string> = {
  U: "de arriba",
  D: "de abajo",
  R: "derecha",
  L: "izquierda",
  F: "del frente",
  B: "de atrás",
};

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

interface Piece {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  stickers: { normal: THREE.Vector3; color: string }[];
}

function buildPieces(): Piece[] {
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
function isSolved(pieces: Piece[]) {
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

interface Turn {
  move: Move;
  ms: number;
  counts: boolean;
}

/**
 * The cube's mutable state, outside React: the pieces, the queue of pending turns and the turn in progress.
 * The scene calls step() every frame; the buttons call push() and reset(). React only renders the meshes once.
 */
class CubeController {
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

// Memoised: the counter and messages re-render the parent, and the meshes must not be rebuilt then.
const Cube = memo(function Cube({
  cube,
  onTurnDone,
}: {
  cube: CubeController;
  onTurnDone: (turn: Turn, idle: boolean) => void;
}) {
  useFrame(({ clock }) => {
    const done = cube.step(clock.elapsedTime * 1000);
    if (done) onTurnDone(done.turn, done.idle);
  });

  return (
    <group>
      {cube.pieces.map((p, i) => (
        <group
          key={i}
          ref={(el) => {
            cube.groups[i] = el;
          }}
          position={p.home.toArray()}
        >
          <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.08} smoothness={3}>
            <meshStandardMaterial color="#18203A" roughness={0.6} />
          </RoundedBox>
          {p.stickers.map((s) => (
            <mesh
              key={s.color}
              position={s.normal.clone().multiplyScalar(0.485).toArray()}
              rotation={s.normal.x ? [0, (Math.PI / 2) * s.normal.x, 0] : s.normal.y ? [(-Math.PI / 2) * s.normal.y, 0, 0] : [0, s.normal.z > 0 ? 0 : Math.PI, 0]}
            >
              <planeGeometry args={[0.8, 0.8]} />
              <meshStandardMaterial color={s.color} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
});

export default function RubikScene() {
  const [cube] = useState(() => new CubeController());
  const [moves, setMoves] = useState(0);
  const [scrambled, setScrambled] = useState(false);
  const [solved, setSolved] = useState(true);

  const onTurnDone = useCallback(
    (t: Turn, idle: boolean) => {
      if (t.counts) setMoves((n) => n + 1);
      if (idle) setSolved(cube.solved());
    },
    [cube],
  );

  const turn = (face: Face, prime: boolean) => {
    const m = FACES[face];
    cube.push({ move: { ...m, dir: (prime ? -m.dir : m.dir) as 1 | -1 }, ms: 220, counts: true });
  };

  const scramble = () => {
    const faces = Object.keys(FACES) as Face[];
    let last: Axis | null = null;
    for (let i = 0; i < 20; i++) {
      // Never two turns on the same axis in a row, so the scramble does not undo itself.
      const options = faces.filter((f) => FACES[f].axis !== last);
      const face = options[Math.floor(Math.random() * options.length)];
      last = FACES[face].axis;
      const m = FACES[face];
      cube.push({ move: { ...m, dir: (Math.random() < 0.5 ? -m.dir : m.dir) as 1 | -1 }, ms: 90, counts: false });
    }
    setMoves(0);
    setScrambled(true);
    setSolved(false);
  };

  const reset = () => {
    cube.reset();
    setMoves(0);
    setScrambled(false);
    setSolved(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const face = e.key.toUpperCase() as Face;
    if (face in FACES) {
      e.preventDefault();
      turn(face, e.shiftKey);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="h-[200px] w-[200px] cursor-grab rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-larimar active:cursor-grabbing"
        tabIndex={0}
        role="application"
        aria-label="Cubo de Rubik. Arrastra para girarlo; las letras U, D, R, L, F y B giran una cara y con Mayús al revés."
        onKeyDown={onKey}
      >
        <Canvas camera={{ position: [4.2, 3.6, 5.2], fov: 34 }} dpr={[1, 2]}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 6]} intensity={1.4} />
          <directionalLight position={[-6, -4, -5]} intensity={0.5} />
          <Cube cube={cube} onTurnDone={onTurnDone} />
          <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.8} />
        </Canvas>
      </div>
      <div className="grid grid-cols-6 gap-1" role="group" aria-label="Girar caras">
        {(Object.keys(FACES) as Face[]).flatMap((f) =>
          [false, true].map((prime) => (
            <button
              key={f + prime}
              type="button"
              onClick={() => turn(f, prime)}
              aria-label={`Girar la cara ${FACE_NAMES[f]} ${prime ? "al revés" : "en sentido del reloj"}`}
              className="h-7 w-8 rounded-md border font-mono text-xs text-foreground hover:border-larimar hover:text-larimar"
            >
              {f}
              {prime ? "′" : ""}
            </button>
          )),
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <button type="button" onClick={scramble} className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">
          Mezclar
        </button>
        <button type="button" onClick={reset} className="rounded-full border px-3 py-1 hover:border-larimar hover:text-larimar">
          Reiniciar
        </button>
      </div>
      <p className="h-4 text-xs text-muted-foreground" aria-live="polite">
        {scrambled && solved ? `¡Resuelto en ${moves} movimientos!` : scrambled ? `${moves} movimientos` : "Mézclalo y resuélvelo"}
      </p>
    </div>
  );
}
