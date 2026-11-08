"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { toneOf } from "@/lib/urgency";

/** One open opportunity on the sphere. */
export interface SphereTile {
  slug: string;
  name: string;
  sponsor?: string;
  days: number;
  /** Closing date already formatted for people, e.g. "24 nov 2026". */
  date: string;
}

interface TileSphereProps {
  tiles: SphereTile[];
  onSelect?: (slug: string) => void;
  animate?: boolean;
}

const R = 1;
const CORE = "#10141F";
/** How many of the soonest tiles get pushed out and enlarged at the front. */
const SPOTLIGHT = 10;

/** Fibonacci points on the sphere, nearest to the camera (+z) first, so the soonest tiles land in front. */
function frontFirstPoints(n: number) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    points.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r));
  }
  // Slightly above the equator reads as "front" once the sphere is tilted toward the viewer.
  const front = new THREE.Vector3(0, 0.12, 1).normalize();
  return points.sort((a, b) => b.dot(front) - a.dot(front));
}

/** The face of a tile: the number of days left, drawn once per (days, ink) and shared. */
const faceCache = new Map<string, THREE.CanvasTexture>();
function faceTexture(days: number, ink: string) {
  const key = `${days}|${ink}`;
  const cached = faceCache.get(key);
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const big = days === 0 ? "HOY" : String(days);
  const small = days === 0 ? "cierra" : days === 1 ? "día" : "días";
  ctx.font = `700 ${big.length >= 3 ? 46 : 58}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(big, size / 2, 74);
  ctx.font = `500 22px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.globalAlpha = 0.8;
  ctx.fillText(small, size / 2, 104);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  faceCache.set(key, texture);
  return texture;
}

function Tile({
  tile,
  index,
  position,
  size,
  geometry,
  material,
  hovered,
  onHover,
  onSelect,
}: {
  tile: SphereTile;
  index: number;
  position: THREE.Vector3;
  size: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  hovered: boolean;
  onHover: (index: number | null) => void;
  onSelect?: (slug: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const tone = toneOf(tile.days, index);
  const face = useMemo(() => faceTexture(tile.days, tone.ink), [tile.days, tone.ink]);
  // Face outward with the world's "up" kept up, so every tile's number reads upright.
  const quaternion = useMemo(() => {
    const m = new THREE.Matrix4().lookAt(position.clone().multiplyScalar(2), position, new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [position]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const target = hovered ? size * 1.3 : size;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target, 12, delta));
  });

  return (
    <group ref={group} position={position} quaternion={quaternion} scale={size}>
      <mesh
        geometry={geometry}
        material={material}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(index);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect?.(tile.slug);
        }}
      />
      <mesh position={[0, 0, 0.092]} raycast={() => null}>
        <planeGeometry args={[0.92, 0.92]} />
        <meshBasicMaterial map={face} transparent toneMapped={false} />
      </mesh>
      {hovered && (
        <Html center position={[0, 0.95, 0.1]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
          <div className="w-56 -translate-y-1/2 rounded-xl bg-[#18203A] px-3 py-2 text-left text-white shadow-lg">
            <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{tile.name}</p>
            {tile.sponsor && <p className="mt-0.5 line-clamp-1 text-[11px] text-white/70">{tile.sponsor}</p>}
            <p className="mt-1 font-mono text-[10px] text-[#FFC531]">
              Cierra el {tile.date} · {tile.days === 0 ? "hoy" : tile.days === 1 ? "falta 1 día" : `faltan ${tile.days} días`}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

function Sphere({ tiles, onSelect, animate }: Required<Omit<TileSphereProps, "onSelect">> & Pick<TileSphereProps, "onSelect">) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 0.18, 3, 0.16), []);
  const materials = useMemo(() => {
    const byColor = new Map<string, THREE.MeshStandardMaterial>();
    return tiles.map((t, i) => {
      const { bg } = toneOf(t.days, i);
      if (!byColor.has(bg)) byColor.set(bg, new THREE.MeshStandardMaterial({ color: bg, roughness: 0.42, metalness: 0.05 }));
      return byColor.get(bg)!;
    });
  }, [tiles]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => new Set(materials).forEach((m) => m.dispose()), [materials]);

  const placed = useMemo(() => {
    const points = frontFirstPoints(tiles.length);
    // Tile edge from the average spacing of n points on a unit sphere, leaving a thin gap.
    const base = 0.9 * Math.sqrt((4 * Math.PI) / Math.max(tiles.length, 1));
    return tiles.map((tile, i) => {
      const spot = i < SPOTLIGHT;
      return {
        tile,
        position: points[i].clone().multiplyScalar(spot ? R * 1.04 : R),
        size: spot ? base * 1.06 : base,
      };
    });
  }, [tiles]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = animate && hovered === null ? clock.getElapsedTime() : null;
    if (t === null) return;
    // Sway around the front instead of spinning, so the soonest tiles stay in view.
    g.rotation.y = Math.sin(t * 0.22) * 0.6;
    g.rotation.x = 0.1 + Math.sin(t * 0.17) * 0.08;
  });

  useEffect(() => {
    document.body.style.cursor = hovered === null ? "" : "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <group ref={group} rotation={[0.1, 0, 0]}>
      {/* The dark core hides the tiles on the far side and stops pointer events from reaching them. */}
      <mesh
        onPointerOver={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[R * 0.965, 48, 48]} />
        <meshStandardMaterial color={CORE} roughness={0.8} />
      </mesh>
      {placed.map(({ tile, position, size }, i) => (
        <Tile
          key={tile.slug}
          tile={tile}
          index={i}
          position={position}
          size={size}
          geometry={geometry}
          material={materials[i]}
          hovered={hovered === i}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

/** On touch screens a drag must scroll the page, so there are no orbit controls there. */
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

export default function TileSphere({ tiles, onSelect, animate = true }: TileSphereProps) {
  const coarse = useCoarsePointer();
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 3.55], fov: 38 }}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.4} />
      <directionalLight position={[-3, -1, 2]} intensity={0.35} color="#BFD2FF" />
      <Sphere tiles={tiles} onSelect={onSelect} animate={animate} />
      {!coarse && <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.55} />}
    </Canvas>
  );
}
