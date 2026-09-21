"use client";

import { Float } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const NAVY = "#18203A";
const COBALT = "#3054DE";
const CORAL = "#FF7869";
const LIME = "#C8FF48";

/** A graduation cap built from primitives: board, crown and tassel. */
function Mortarboard({ color = NAVY, tassel = CORAL }: { color?: string; tassel?: string }) {
  return (
    <group>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.1, 0.05, 1.1]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.36, 0.4, 0.38, 32]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color={tassel} />
      </mesh>
      <mesh position={[0.42, -0.2, 0.1]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.018, 0.018, 0.5, 8]} />
        <meshStandardMaterial color={tassel} />
      </mesh>
    </group>
  );
}

/** An acceptance letter: envelope body plus a folded flap. */
function Envelope({ color = LIME }: { color?: string }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1, 0.64, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0.025]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 0.1]}>
        <boxGeometry args={[0.52, 0.52, 0.1]} />
        <meshStandardMaterial color={NAVY} roughness={0.7} />
      </mesh>
    </group>
  );
}

type Piece = { kind: "cap" | "envelope"; color?: string; tassel?: string; position: [number, number, number]; rotation: [number, number, number]; scale: number; speed: number; rot: number; float: number };

// One cluster in the middle of its own canvas, so it reads at any aspect ratio.
const PIECES: Piece[] = [
  { kind: "cap", position: [0.1, 0.55, 0], rotation: [0.55, 0.35, -0.15], scale: 1.35, speed: 0.9, rot: 0.9, float: 1.1 },
  { kind: "envelope", position: [-1.15, -1.05, 0.4], rotation: [0.25, 0.5, -0.25], scale: 0.95, speed: 0.75, rot: 0.8, float: 1.3 },
  { kind: "cap", color: COBALT, tassel: LIME, position: [1.35, -0.55, -0.9], rotation: [0.7, -0.5, 0.35], scale: 0.7, speed: 1.1, rot: 1.2, float: 1.2 },
  { kind: "envelope", color: CORAL, position: [1.1, 1.65, -1.4], rotation: [-0.3, -0.4, 0.2], scale: 0.55, speed: 0.95, rot: 0.9, float: 1.4 },
];

export default function FloatingScene({ animate = true }: { animate?: boolean }) {
  const speed = animate ? 1.4 : 0;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }} frameloop={animate ? "always" : "demand"} gl={{ alpha: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} intensity={10} color={COBALT} />
      {PIECES.map((p, i) => (
        <Float key={i} speed={speed * p.speed} rotationIntensity={p.rot} floatIntensity={p.float}>
          <group position={p.position} rotation={p.rotation} scale={p.scale}>
            {p.kind === "cap" ? <Mortarboard color={p.color} tassel={p.tassel} /> : <Envelope color={p.color} />}
          </group>
        </Float>
      ))}
    </Canvas>
  );
}
