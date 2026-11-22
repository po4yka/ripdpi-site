import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { hash, usePalette, useSceneTime } from "./kit";

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
    // Each brick has its own tone, and one in nine is chipped: darker at a corner.
    g.fillStyle = `#${palette.ink.getHexString()}`;
    for (let r = 0; r < rows; r++) {
      for (let k = -1; k < 2; k++) {
        const bx = k * 128 + (r % 2 ? 64 : 0);
        const n = r * 7 + ((k + 3) % 2);
        g.globalAlpha = hash(n) * 0.22;
        g.fillRect(bx, r * rh, 128, rh);
        if (hash(n + 400) > 0.89) {
          g.globalAlpha = 0.45;
          g.beginPath();
          g.moveTo(bx + 128, r * rh);
          g.lineTo(bx + 128 - 30 - hash(n + 500) * 30, r * rh);
          g.lineTo(bx + 128, r * rh + 10 + hash(n + 600) * 14);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
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
  // The wire along the top: one coil from end to end.
  const wire = useMemo(() => {
    const points = Array.from({ length: 97 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2 * 7;
      return new THREE.Vector3(-w / 2 + 0.15 + (i / 96) * (w - 0.3), Math.sin(a) * 0.28, Math.cos(a) * 0.28);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 192, 0.035, 5);
  }, [w]);
  useEffect(() => () => (texture.dispose(), wire.dispose()), [texture, wire]);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={3} roughness={0.95} />
      </mesh>
      {/* The coping, and the wire along it. */}
      <mesh position={[0, h + 0.11, 0]}>
        <boxGeometry args={[w + 0.3, 0.22, d + 0.3]} />
        <meshStandardMaterial color={palette.stone} roughness={0.9} />
      </mesh>
      <mesh geometry={wire} position={[0, h + 0.5, 0]}>
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
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
      {/* The axis leans, as a desk globe's does; the grid turns about it. */}
      <group position={[0, 2.4, 0]} rotation-z={-0.41}>
        <group ref={lines}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} rotation-y={(i * Math.PI) / 6}>
              <torusGeometry args={[1.105, 0.012, 4, 64]} />
              <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
            </mesh>
          ))}
          {[-0.85, -0.45, 0, 0.45, 0.85].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[Math.sqrt(1.105 ** 2 - y * y), 0.012, 4, 64]} />
              <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
            </mesh>
          ))}
        </group>
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
      {/* The camera in the screen, and the button on the side. */}
      <mesh position={[0, h - 0.24, 0.215]}>
        <circleGeometry args={[0.045, 16]} />
        <meshBasicMaterial color={palette.ink} />
      </mesh>
      <mesh position={[w / 2, h * 0.68, 0]}>
        <boxGeometry args={[0.06, h * 0.13, 0.12]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
      </mesh>
      <group position={[0, h / 2 + 0.05, 0.22]}>{children}</group>
    </group>
  );
}

/** A small app mark: a rounded tile in the mid tone, as the apps of the Wall scene. */
export function AppMark({ position, glyph = 0 }: { position: [number, number, number]; glyph?: number }) {
  const palette = usePalette();
  // Unlit, as the text of the board: a sign must read on a tile that faces away from the moon.
  const paper = <meshBasicMaterial color={palette.paper} />;
  // The sign on the tile, as the apps of the app's scene carry one: a bubble, a play mark, a ring, a letter, a star.
  const signs = [
    <mesh key="bubble">
      <circleGeometry args={[0.19, 24]} />
      {paper}
    </mesh>,
    <mesh key="play" rotation-z={-Math.PI / 2}>
      <circleGeometry args={[0.21, 3]} />
      {paper}
    </mesh>,
    <mesh key="ring">
      <ringGeometry args={[0.11, 0.2, 24]} />
      {paper}
    </mesh>,
    <mesh key="letter">
      <planeGeometry args={[0.38, 0.26]} />
      {paper}
    </mesh>,
    <mesh key="star" rotation-z={Math.PI / 4}>
      <circleGeometry args={[0.21, 4]} />
      {paper}
    </mesh>,
  ];
  return (
    <group position={position}>
      <RoundedBox args={[0.7, 0.7, 0.2]} radius={0.12}>
        <meshStandardMaterial color={palette.mid} roughness={0.6} />
      </RoundedBox>
      <group position={[0, 0, 0.115]}>{signs[glyph % signs.length]}</group>
    </group>
  );
}

/**
 * The key of the tunnel, as it shows on the device's screen (ConnectScene.kt): a bow, a shaft and two teeth. The
 * station gives the material, so it can light the key and let it breathe.
 */
export function Key({ material }: { material: THREE.Material }) {
  return (
    <group>
      <mesh position={[-0.2, 0, 0]} material={material}>
        <ringGeometry args={[0.09, 0.17, 28]} />
      </mesh>
      <mesh position={[0.15, 0, 0]} material={material}>
        <planeGeometry args={[0.4, 0.07]} />
      </mesh>
      {[0.2, 0.31].map((x) => (
        <mesh key={x} position={[x, -0.09, 0]} material={material}>
          <planeGeometry args={[0.07, 0.13]} />
        </mesh>
      ))}
    </group>
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
        <mesh position={[0, -0.2, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.05, 0.014, 6, 16]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
        {/* The roof, square with the lamp, and the four bars of its cage. */}
        <mesh position={[0, -0.3, 0]} rotation-y={Math.PI / 4}>
          <coneGeometry args={[0.29, 0.14, 4]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
        </mesh>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.17, -0.6, sz * 0.17]}>
              <boxGeometry args={[0.035, 0.5, 0.035]} />
              <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.3} />
            </mesh>
          )),
        )}
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
