"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { toneOf } from "@/lib/urgency";

/** One upcoming deadline in the tower. */
export interface TowerBlock {
  slug: string;
  name: string;
  sponsor?: string;
  days: number;
  /** Closing date already formatted for people, e.g. "24 nov 2026". */
  date: string;
}

interface JengaTowerProps {
  blocks: TowerBlock[];
  onSelect?: (slug: string) => void;
  animate?: boolean;
}

/** A Jenga tower of the next deadlines: three blocks per level, levels crossed, the soonest at the top. */
const PER_LEVEL = 3;
const LENGTH = 3;
const HEIGHT = 0.56;
const WIDTH = 0.96;
const PITCH = 1; // block centre to centre within a level
const RISE = HEIGHT + 0.03;
/** Blocks this close to closing already stick out of the tower, as if someone were pulling them. */
const PULLED_DAYS = 3;
const PULL = 0.55;
const HOVER_PULL = 0.95;

const daysText = (d: number) => (d === 0 ? "HOY" : d === 1 ? "1 día" : `${d} días`);
const font = (weight: number, px: number) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The long side of a block: days left, then the opportunity's name, cut to fit. */
function sideTexture(block: TowerBlock, bg: string, ink: string) {
  return canvasTexture(640, 120, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 120);
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.font = font(800, 54);
    const label = daysText(block.days);
    ctx.fillText(label, 24, 62);
    const x = 24 + ctx.measureText(label).width + 22;
    ctx.globalAlpha = 0.85;
    ctx.font = font(600, 30);
    const room = 640 - x - 20;
    let name = block.name;
    if (ctx.measureText(name).width > room) {
      while (name.length > 1 && ctx.measureText(`${name}…`).width > room) name = name.slice(0, -1);
      name = `${name.trimEnd()}…`;
    }
    ctx.fillText(name, x, 64);
  });
}

/** The end of a block: just the days left, big. */
function endTexture(block: TowerBlock, bg: string, ink: string) {
  return canvasTexture(220, 120, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 220, 120);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(800, block.days === 0 ? 50 : 60);
    ctx.fillText(block.days === 0 ? "HOY" : String(block.days), 110, 56);
    if (block.days > 0) {
      ctx.globalAlpha = 0.8;
      ctx.font = font(600, 20);
      ctx.fillText(block.days === 1 ? "día" : "días", 110, 98);
    }
  });
}

function Block({
  block,
  index,
  position,
  pullSign,
  hovered,
  onHover,
  onSelect,
}: {
  block: TowerBlock;
  index: number;
  position: [number, number, number];
  pullSign: 1 | -1;
  hovered: boolean;
  onHover: (i: number | null) => void;
  onSelect?: (slug: string) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const tone = toneOf(block.days, index);
  const materials = useMemo(() => {
    const side = sideTexture(block, tone.bg, tone.ink);
    const end = endTexture(block, tone.bg, tone.ink);
    const plain = new THREE.MeshStandardMaterial({ color: tone.bg, roughness: 0.55 });
    const withMap = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z. The block runs along x, so ±x are its ends and ±z its long sides.
    return [withMap(end), withMap(end), plain, plain, withMap(side), withMap(side)];
  }, [block, tone.bg, tone.ink]);
  useEffect(
    () => () =>
      materials.forEach((m) => {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }),
    [materials],
  );

  const rest = block.days <= PULLED_DAYS ? PULL : 0;
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const target = position[0] + pullSign * (hovered ? HOVER_PULL : rest);
    m.position.x = THREE.MathUtils.damp(m.position.x, target, 10, delta);
  });

  return (
    <mesh
      ref={mesh}
      position={[position[0] + pullSign * rest, position[1], position[2]]}
      material={materials}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(index);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect?.(block.slug);
      }}
    >
      <boxGeometry args={[LENGTH, HEIGHT, WIDTH]} />
      {hovered && (
        <Html center position={[pullSign * (LENGTH / 2 + 0.3), 0.9, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
          <div className="w-60 rounded-xl bg-[#18203A] px-3 py-2 text-left text-white shadow-lg">
            <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{block.name}</p>
            {block.sponsor && <p className="mt-0.5 line-clamp-1 text-[11px] text-white/70">{block.sponsor}</p>}
            <p className="mt-1 font-mono text-[10px] text-[#FFC531]">
              Cierra el {block.date} · {block.days === 0 ? "hoy" : block.days === 1 ? "falta 1 día" : `faltan ${block.days} días`}
            </p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Tower({ blocks, onSelect, animate }: Required<Omit<JengaTowerProps, "onSelect">> & Pick<JengaTowerProps, "onSelect">) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const levels = Math.ceil(blocks.length / PER_LEVEL);

  // Soonest first at the top: block i sits on level (levels - 1 - floor(i / 3)) from the bottom.
  const placed = useMemo(
    () =>
      blocks.map((block, i) => {
        const fromTop = Math.floor(i / PER_LEVEL);
        const level = levels - 1 - fromTop;
        const slot = i % PER_LEVEL;
        return {
          block,
          level,
          position: [0, level * RISE + HEIGHT / 2, (slot - 1) * PITCH] as [number, number, number],
          // Pulled blocks come out on alternating sides, so the tower stays readable from every angle.
          pullSign: ((i % 2) * 2 - 1) as 1 | -1,
        };
      }),
    [blocks, levels],
  );

  useFrame((_, delta) => {
    if (group.current && animate && hovered === null) group.current.rotation.y += delta * 0.18;
  });

  useEffect(() => {
    document.body.style.cursor = hovered === null ? "" : "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <group ref={group} rotation={[0, -0.5, 0]}>
      {Array.from({ length: levels }, (_, level) => (
        // Jenga crosses every level: odd levels turn a quarter.
        <group key={level} rotation={[0, level % 2 ? Math.PI / 2 : 0, 0]}>
          {placed
            .filter((p) => p.level === level)
            .map((p) => {
              const i = blocks.indexOf(p.block);
              return (
                <Block
                  key={p.block.slug}
                  block={p.block}
                  index={i}
                  position={p.position}
                  pullSign={p.pullSign}
                  hovered={hovered === i}
                  onHover={setHovered}
                  onSelect={onSelect}
                />
              );
            })}
        </group>
      ))}
      {/* A wooden base under the tower. */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[2.7, 2.9, 0.22, 48]} />
        <meshStandardMaterial color="#D9C29A" roughness={0.8} />
      </mesh>
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

export default function JengaTower({ blocks, onSelect, animate = true }: JengaTowerProps) {
  const coarse = useCoarsePointer();
  const height = Math.ceil(blocks.length / PER_LEVEL) * RISE;
  const middle = height / 2;
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [8.5, middle + 3.2, 8.5], fov: 36 }}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, middle - 0.4, 0)}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 12, 8]} intensity={1.3} />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#DDE6FF" />
      <Tower blocks={blocks} onSelect={onSelect} animate={animate} />
      {!coarse && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.55}
          target={[0, middle - 0.4, 0]}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.05}
        />
      )}
    </Canvas>
  );
}
