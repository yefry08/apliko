"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useCallback, useRef, useState, useSyncExternalStore } from "react";
import type * as THREE from "three";
import { CubeController, FACES, type Axis, type Face, type Turn } from "./rubik-cube";

/**
 * A playable 3×3 Rubik's cube: 27 pieces whose transforms change inside useFrame (CubeController, in
 * ./rubik-cube.ts), so a turn never re-renders React.
 */

const FACE_NAMES: Record<Face, string> = {
  U: "de arriba",
  D: "de abajo",
  R: "derecha",
  L: "izquierda",
  F: "del frente",
  B: "de atrás",
};

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

/** On touch screens a drag must scroll the page, so the view turns by itself instead of with OrbitControls. */
function useCoarsePointer() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

function Spin({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });
  return (
    <group ref={group} rotation={[0.35, 0.6, 0]}>
      {children}
    </group>
  );
}

/** `large` fills its container (the portada hero); otherwise a compact 200 px cube. */
export default function RubikScene({ large = false }: { large?: boolean }) {
  const coarse = useCoarsePointer();
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
    <div className="flex w-full flex-col items-center gap-3">
      <div
        className={`${large ? "aspect-square w-full max-w-[480px]" : "h-[200px] w-[200px]"} ${coarse ? "" : "cursor-grab active:cursor-grabbing"} rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-larimar`}
        tabIndex={0}
        role="application"
        aria-label="Cubo de Rubik. Arrastra para girarlo; las letras U, D, R, L, F y B giran una cara y con Mayús al revés."
        onKeyDown={onKey}
      >
        <Canvas camera={{ position: [4.2, 3.6, 5.2], fov: 34 }} dpr={[1, 2]}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 6]} intensity={1.4} />
          <directionalLight position={[-6, -4, -5]} intensity={0.5} />
          {coarse ? (
            <Spin>
              <Cube cube={cube} onTurnDone={onTurnDone} />
            </Spin>
          ) : (
            <>
              <Cube cube={cube} onTurnDone={onTurnDone} />
              <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.8} />
            </>
          )}
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
              className={`${large ? "h-9 w-11 text-sm" : "h-7 w-8 text-xs"} rounded-md border bg-card font-mono text-foreground hover:border-larimar hover:text-larimar`}
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
        {scrambled && solved
          ? `¡Resuelto en ${moves} ${moves === 1 ? "movimiento" : "movimientos"}!`
          : scrambled
            ? `${moves} ${moves === 1 ? "movimiento" : "movimientos"}`
            : "Mézclalo y resuélvelo"}
      </p>
    </div>
  );
}
