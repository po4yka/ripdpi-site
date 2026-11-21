import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { usePalette, useSceneTime } from "./kit";

/** A brick tower, as the wall of the app's Wall and Connect scenes: paper bricks drawn in ink. */
export function BrickTower({ x, w = 2.2, h = 7.5, d = 2.2 }: { x: number; w?: number; h?: number; d?: number }) {
  const palette = usePalette();
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const g = canvas.getContext("2d")!;
    g.fillStyle = `#${palette.paper.getHexString()}`;
    g.fillRect(0, 0, 256, 512);
    g.strokeStyle = `#${palette.ink.getHexString()}`;
    g.lineWidth = 5;
    const rows = 16;
    const rh = 512 / rows;
    for (let r = 0; r <= rows; r++) {
      g.beginPath();
      g.moveTo(0, r * rh);
      g.lineTo(256, r * rh);
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const bx = (k * 256) / 2 + (r % 2 ? 64 : 0);
        g.beginPath();
        g.moveTo(bx, r * rh);
        g.lineTo(bx, (r + 1) * rh);
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [palette]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={6} roughness={0.95} />
      </mesh>
      {/* The coping, and the wire along it. */}
      <mesh position={[0, h + 0.11, 0]}>
        <boxGeometry args={[w + 0.3, 0.22, d + 0.3]} />
        <meshStandardMaterial color={palette.stone} roughness={0.9} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.2 + (i * (w - 0.4)) / 5, h + 0.5, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.28, 0.05, 6, 16]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** The open internet: a globe on a stand, as in the app. */
export function Globe({ x, scale = 1 }: { x: number; scale?: number }) {
  const palette = usePalette();
  const time = useSceneTime();
  const lines = useRef<THREE.Group>(null!);
  // The globe turns slowly, as the app's does.
  useFrame(() => void (lines.current.rotation.y = time.current * 0.45));
  return (
    <group position={[x, 0, 0]} scale={scale}>
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[1.1, 32, 20]} />
        <meshStandardMaterial color={palette.paper} roughness={0.7} />
      </mesh>
      <group ref={lines} position={[0, 2.4, 0]}>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => (
          <mesh key={a} rotation-y={a}>
            <torusGeometry args={[1.105, 0.018, 4, 48]} />
            <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
          </mesh>
        ))}
        {[-0.55, 0, 0.55].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[Math.sqrt(1.105 ** 2 - y * y), 0.018, 4, 48]} />
            <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 1.3, 8]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.12, 24]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
    </group>
  );
}

/** The device: an ink phone with a screen. Children sit on its screen. */
export function Phone({ x, h = 3.2, children }: { x: number; h?: number; children?: React.ReactNode }) {
  const palette = usePalette();
  const w = h * 0.55;
  return (
    <group position={[x, 0, 0]}>
      <RoundedBox args={[w, h, 0.4]} radius={0.22} position={[0, h / 2 + 0.05, 0]}>
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </RoundedBox>
      {/* The screen: a shade lighter than the body, set in from its edge. */}
      <RoundedBox args={[w - 0.2, h - 0.3, 0.02]} radius={0.01} position={[0, h / 2 + 0.05, 0.2]}>
        <meshStandardMaterial color={palette.carve} roughness={0.3} />
      </RoundedBox>
      <group position={[0, h / 2 + 0.05, 0.22]}>{children}</group>
    </group>
  );
}

/** A small app mark: a rounded tile in the mid tone, as the apps of the Wall scene. */
export function AppMark({ position }: { position: [number, number, number] }) {
  const palette = usePalette();
  return (
    <RoundedBox args={[0.7, 0.7, 0.2]} radius={0.12} position={position}>
      <meshStandardMaterial color={palette.mid} roughness={0.6} />
    </RoundedBox>
  );
}

/** The sealed name the ghost carries over its head (CheckpointScene.kt, card): a paper card with a padlock. It floats in
 * front of the stamp's path, so the stamp comes down behind it.
 */
export function SealedName() {
  const palette = usePalette();
  return (
    <group position={[0, 3.4, 0.9]} rotation-z={-0.06}>
      <RoundedBox args={[1.9, 0.62, 0.1]} radius={0.05}>
        <meshStandardMaterial color={palette.paper} roughness={0.8} />
      </RoundedBox>
      <mesh position={[-0.66, -0.06, 0.07]}>
        <boxGeometry args={[0.28, 0.22, 0.08]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[-0.66, 0.07, 0.07]}>
        <torusGeometry args={[0.09, 0.028, 6, 16]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
      {[
        [0.22, 0.09, 1],
        [0.07, -0.1, 0.7],
      ].map(([px, py, len]) => (
        <mesh key={py} position={[px!, py!, 0.06]}>
          <boxGeometry args={[len!, 0.07, 0.02]} />
          <meshStandardMaterial color={palette.ink} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** The lens the ghost takes along the line (TroubleScene.kt): a ring with a faint glass, on a short handle. */
export function Lens() {
  const palette = usePalette();
  return (
    <group position={[-1.6, -1.2, 0.3]}>
      <mesh>
        <torusGeometry args={[0.9, 0.07, 8, 40]} />
        <meshStandardMaterial color={palette.ink} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh userData={{ noShadow: true }}>
        <circleGeometry args={[0.9, 40]} />
        <meshBasicMaterial color={palette.paper} transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh position={[0.9, 0.9, 0]} rotation-z={-Math.PI / 4}>
        <cylinderGeometry args={[0.07, 0.07, 0.75, 8]} />
        <meshStandardMaterial color={palette.ink} roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * The lantern of the night watch (NightScene.kt): it hangs from a short pole at the ghost's side and swings a
 * little. Its light is the signal.
 */
export function Lantern() {
  const palette = usePalette();
  const time = useSceneTime();
  const lamp = useRef<THREE.Group>(null!);
  useFrame(() => void (lamp.current.rotation.z = Math.sin(time.current * 2.6) * 0.16));
  return (
    <group position={[1.0, 2.05, 0.45]}>
      <mesh position={[0.4, 0.1, 0]} rotation-z={-Math.PI / 2 + 0.25}>
        <cylinderGeometry args={[0.03, 0.03, 0.85, 6]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
      <group ref={lamp} position={[0.8, 0.2, 0]}>
        <mesh position={[0, -0.14, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.28, 4]} />
          <meshStandardMaterial color={palette.ink} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <coneGeometry args={[0.26, 0.14, 4]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.32, 0.46, 0.32]} />
          <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.86, 0]}>
          <boxGeometry args={[0.4, 0.06, 0.4]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
        <pointLight position={[0, -0.6, 0.3]} color={palette.signal} intensity={18} distance={8} decay={1.6} />
      </group>
    </group>
  );
}
