"use client";

import { Html, Line } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { COORDS, ORIGIN } from "@/lib/geo";

export interface GlobeDestination {
  name: string;
  count: number;
}

interface GlobeSceneProps {
  destinations: GlobeDestination[];
  onSelect?: (name: string) => void;
  animate?: boolean;
}

const R = 1;
// Day palette for the white portada: navy lattice, cobalt routes, coral origin.
const NAVY = "#18203A";
const COBALT = "#3054DE";
const CORAL = "#E8566A";
const SURFACE = "#EDF3FF";

function toVec3(lat: number, lng: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Evenly spread dots over the sphere (Fibonacci lattice). */
function DotSphere() {
  const geometry = useMemo(() => {
    const n = 2600;
    const positions = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const t = golden * i;
      positions.set([Math.cos(t) * radius * R * 1.002, y * R * 1.002, Math.sin(t) * radius * R * 1.002], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial color={NAVY} size={0.012} transparent opacity={0.28} sizeAttenuation />
    </points>
  );
}

function Arc({ to, weight, index, animate }: { to: THREE.Vector3; weight: number; index: number; animate: boolean }) {
  const lineRef = useRef<{ material: { dashOffset: number } } | null>(null);
  const from = useMemo(() => toVec3(...ORIGIN), []);
  const points = useMemo(() => {
    const dist = from.distanceTo(to);
    const mid = from
      .clone()
      .add(to)
      .normalize()
      .multiplyScalar(R + dist * 0.35);
    return new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(64);
  }, [from, to]);

  useFrame((_, delta) => {
    if (animate && lineRef.current) lineRef.current.material.dashOffset -= delta * (0.25 + index * 0.01);
  });

  return (
    <Line
      // drei's Line ref exposes the Line2 object; only the material offset is touched here
      ref={lineRef as never}
      points={points}
      color={COBALT}
      lineWidth={Math.min(1 + weight * 0.25, 3)}
      transparent
      opacity={0.85}
      dashed
      dashSize={0.06}
      gapSize={0.03}
    />
  );
}

function Marker({
  position,
  label,
  count,
  onSelect,
}: {
  position: THREE.Vector3;
  label: string;
  count: number;
  onSelect?: (name: string) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(label);
        }}
      >
        <sphereGeometry args={[hover ? 0.032 : 0.022, 16, 16]} />
        <meshBasicMaterial color={hover ? NAVY : COBALT} />
      </mesh>
      {hover && (
        <Html center style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
          <div className="translate-y-[-18px] whitespace-nowrap rounded-full bg-[#18203A] px-2 py-0.5 font-mono text-[10px] text-white">
            {label} · {count}
          </div>
        </Html>
      )}
    </group>
  );
}

function Origin() {
  const ring = useRef<THREE.Mesh>(null);
  const position = useMemo(() => toVec3(...ORIGIN, R * 1.004), []);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize()),
    [position],
  );
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = (clock.getElapsedTime() % 2) / 2;
    ring.current.scale.setScalar(1 + t * 2.5);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
  });
  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <circleGeometry args={[0.025, 24]} />
        <meshBasicMaterial color={CORAL} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.03, 0.038, 32]} />
        <meshBasicMaterial color={CORAL} transparent />
      </mesh>
      <Html center style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div className="translate-y-[16px] whitespace-nowrap font-mono text-[10px] font-medium text-[#E8566A]">
          Santo Domingo
        </div>
      </Html>
    </group>
  );
}

function Globe({ destinations, onSelect, animate }: Required<Omit<GlobeSceneProps, "onSelect">> & Pick<GlobeSceneProps, "onSelect">) {
  const group = useRef<THREE.Group>(null);
  const BASE = -0.35; // turns the Caribbean toward the camera

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = animate ? clock.getElapsedTime() : 0;
    group.current.rotation.y = BASE + Math.sin(t * 0.15) * 0.45;
  });

  const placed = useMemo(
    () =>
      destinations
        .filter((d) => COORDS[d.name])
        .sort((a, b) => b.count - a.count)
        .map((d) => ({ ...d, position: toVec3(...COORDS[d.name]) })),
    [destinations],
  );

  return (
    <group ref={group} rotation={[0.28, BASE, 0]}>
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial color={SURFACE} roughness={0.9} metalness={0.05} />
      </mesh>
      <DotSphere />
      <Origin />
      {placed.map((d, i) => (
        <group key={d.name}>
          <Arc to={d.position} weight={d.count} index={i} animate={animate} />
          <Marker position={d.position} label={d.name} count={d.count} onSelect={onSelect} />
        </group>
      ))}
    </group>
  );
}

export default function GlobeScene({ destinations, onSelect, animate = true }: GlobeSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.1], fov: 38 }}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 2, 4]} intensity={0.9} color="#ffffff" />
      <Globe destinations={destinations} onSelect={onSelect} animate={animate} />
    </Canvas>
  );
}
