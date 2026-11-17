"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { axisOf, CubeController, FACES, moveFromDrag, type Axis, type Face, type Turn } from "./rubik-cube";

/**
 * A playable 3×3 Rubik's cube: 27 pieces whose transforms change inside useFrame (CubeController, in
 * ./rubik-cube.ts), so a turn never re-renders React.
 */

/** While a sticker is held the view must not orbit: switches the scene's default controls (OrbitControls) off/on. */
function setControlsEnabled(controls: unknown, on: boolean) {
  if (controls && typeof controls === "object" && "enabled" in controls) (controls as { enabled: boolean }).enabled = on;
}

/** Pixels the pointer must travel before a drag on the cube becomes a turn. */
const DRAG_PX = 12;

interface Grab {
  pointerId: number;
  x: number;
  y: number;
  /** Outward normal of the grabbed face and the grabbed point, in cube coordinates. */
  normal: THREE.Vector3;
  point: THREE.Vector3;
  /** One turn per drag: once it fires, the rest of the drag is ignored until the button comes up. */
  used: boolean;
}

// Memoised: the counter and messages re-render the parent, and the meshes must not be rebuilt then.
const Cube = memo(function Cube({
  cube,
  onTurnDone,
}: {
  cube: CubeController;
  onTurnDone: (turn: Turn, idle: boolean) => void;
}) {
  const root = useRef<THREE.Group>(null);
  const grab = useRef<Grab | null>(null);
  const { camera, gl } = useThree();
  const get = useThree((s) => s.get);

  useFrame(({ clock }) => {
    const done = cube.step(clock.elapsedTime * 1000);
    if (done) onTurnDone(done.turn, done.idle);
  });

  useEffect(() => {
    const setOrbit = (on: boolean) => setControlsEnabled(get().controls, on);
    const el = gl.domElement;
    const toScreen = (v: THREE.Vector3) => {
      const p = v.clone().project(camera);
      return new THREE.Vector2(p.x * el.clientWidth, -p.y * el.clientHeight);
    };
    const onMove = (e: PointerEvent) => {
      const g = grab.current;
      const r = root.current;
      if (!g || !r || g.used || e.pointerId !== g.pointerId) return;
      const drag = new THREE.Vector2(e.clientX - g.x, e.clientY - g.y);
      if (drag.length() < DRAG_PX) return;
      // The two directions a sticker can travel on the grabbed face, seen on screen; take the one the drag follows.
      const start = r.localToWorld(g.point.clone());
      let best: { along: THREE.Vector3; score: number } | null = null;
      for (const axis of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
        if (Math.abs(axis.dot(g.normal)) > 0.5) continue;
        const end = r.localToWorld(g.point.clone().add(axis));
        const onScreen = toScreen(end).sub(toScreen(start)).normalize();
        const score = drag.clone().normalize().dot(onScreen);
        if (!best || Math.abs(score) > Math.abs(best.score)) best = { along: axis.multiplyScalar(Math.sign(score) || 1), score };
      }
      const move = best && moveFromDrag(g.normal, best.along, g.point);
      if (move) cube.push({ move, ms: 200, counts: true });
      g.used = true;
    };
    const onUp = (e: PointerEvent) => {
      if (grab.current?.pointerId !== e.pointerId) return;
      grab.current = null;
      setOrbit(true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [camera, gl, cube, get]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const r = root.current;
    if (!r || !e.face) return;
    e.stopPropagation();
    const inverse = r.matrixWorld.clone().invert();
    const worldNormal = e.face.normal.clone().transformDirection(e.object.matrixWorld);
    const { axis, sign } = axisOf(worldNormal.transformDirection(inverse));
    const normal = new THREE.Vector3();
    normal[axis] = sign;
    grab.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      normal,
      point: e.point.clone().applyMatrix4(inverse),
      used: false,
    };
    setControlsEnabled(get().controls, false);
  };

  return (
    <group ref={root} onPointerDown={onDown}>
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
        className={`${large ? "aspect-square w-full max-w-[480px]" : "h-[200px] w-[200px]"} ${coarse ? "touch-pan-y" : "cursor-grab active:cursor-grabbing"} rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-larimar`}
        tabIndex={0}
        role="application"
        aria-label="Cubo de Rubik. Arrastra una cara del cubo para girar esa fila o columna; arrastra fuera del cubo para darle la vuelta. Con el teclado, U, D, R, L, F y B giran una cara y con Mayús al revés."
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
              <OrbitControls makeDefault enableZoom={false} enablePan={false} rotateSpeed={0.8} />
            </>
          )}
        </Canvas>
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
            : coarse
              ? "Desliza una fila de lado a lado para girarla"
              : "Arrastra una cara para girarla; fuera del cubo, para darle la vuelta"}
      </p>
    </div>
  );
}
