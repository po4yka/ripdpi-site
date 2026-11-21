import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { usePalette } from "./kit";

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
      {/* Wire along the top. */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.2 + (i * (w - 0.4)) / 5, h + 0.3, 0]} rotation-x={Math.PI / 2}>
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
  return (
    <group position={[x, 0, 0]} scale={scale}>
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[1.1, 32, 20]} />
        <meshStandardMaterial color={palette.paper} roughness={0.7} />
      </mesh>
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => (
        <mesh key={a} position={[0, 2.4, 0]} rotation-y={a}>
          <torusGeometry args={[1.105, 0.018, 4, 48]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
      ))}
      {[-0.55, 0, 0.55].map((y) => (
        <mesh key={y} position={[0, 2.4 + y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[Math.sqrt(1.105 ** 2 - y * y), 0.018, 4, 48]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
      ))}
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
