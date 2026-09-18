"use client";

import { Float } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const BONE = "#E1E0CC";
const LARIMAR = "#7CC6E4";
const CORAL = "#E8566A";
const NAVY = "#12243a";

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
function Envelope({ color = BONE }: { color?: string }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1, 0.64, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0.025]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 0.1]}>
        <boxGeometry args={[0.52, 0.52, 0.1]} />
        <meshStandardMaterial color={LARIMAR} roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function FloatingScene({ animate = true }: { animate?: boolean }) {
  const speed = animate ? 1.4 : 0;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }} frameloop={animate ? "always" : "demand"} gl={{ alpha: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} intensity={12} color={LARIMAR} />

      <Float speed={speed} rotationIntensity={1.2} floatIntensity={1.4}>
        <group position={[-3.1, 1.1, 0]} rotation={[0.5, 0.3, -0.2]} scale={0.9}>
          <Mortarboard />
        </group>
      </Float>
      <Float speed={speed * 0.8} rotationIntensity={1} floatIntensity={1.8}>
        <group position={[3.2, -0.9, -0.5]} rotation={[0.2, -0.6, 0.3]} scale={0.8}>
          <Envelope />
        </group>
      </Float>
      <Float speed={speed * 1.1} rotationIntensity={1.4} floatIntensity={1.2}>
        <group position={[2.6, 1.6, -1.5]} rotation={[0.7, -0.4, 0.4]} scale={0.6}>
          <Mortarboard color={LARIMAR} tassel={BONE} />
        </group>
      </Float>
      <Float speed={speed * 0.9} rotationIntensity={0.8} floatIntensity={1.5}>
        <group position={[-2.7, -1.5, -1]} rotation={[-0.3, 0.5, -0.2]} scale={0.55}>
          <Envelope color={CORAL} />
        </group>
      </Float>
    </Canvas>
  );
}
