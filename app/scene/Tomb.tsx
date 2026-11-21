import { Line, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Line2 } from "three/addons/lines/Line2.js";

import { noiseTexture, usePalette } from "./kit";

export const TOMB_W = 5;
export const TOMB_H = 6.3;
const TOMB_D = 1.1;
const TOMB_BEVEL = 0.08;
/** The front face of the stone, bevel included: carving and crack sit just in front of it. */
export const TOMB_FRONT = TOMB_D / 2 + TOMB_BEVEL;
export const FONT = "/fonts/geist_sans_bold.ttf";

// The crack of the app's tombstone (SceneGhost.kt, TombCrack and its branches), in units of the stone's w and h.
// The first point sits just inside the arch, so the line does not stand above the stone.
const CRACK = [0.1, -0.965, 0.02, -0.86, 0.14, -0.74, 0.04, -0.6, 0.2, -0.5, 0.12, -0.36];
const BRANCH_A = [0.14, -0.74, 0.3, -0.7, 0.36, -0.62];
const BRANCH_B = [0.04, -0.6, -0.1, -0.55, -0.16, -0.46];

function crackPoints(list: number[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < list.length; i += 2) out.push([list[i]! * TOMB_W, -list[i + 1]! * TOMB_H, TOMB_FRONT + 0.02]);
  return out;
}

export interface TombState {
  carving: number;
  cracked: number;
  tilt: number;
  /** A sideways shake of the stone, in world units. */
  tremble?: number;
}

/** The tombstone of the app icon: an arch on a base, carved R.I.P. DPI, with a crack that grows. */
export function Tomb({ state, x = 0, z = 0 }: { state: { current: TombState }; x?: number; z?: number }) {
  const palette = usePalette();
  const geometry = useMemo(() => {
    const r = TOMB_W / 2;
    const s = new THREE.Shape();
    s.moveTo(-r, 0);
    s.lineTo(-r, TOMB_H - r);
    s.absarc(0, TOMB_H - r, r, Math.PI, 0, true);
    s.lineTo(r, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: TOMB_D,
      bevelEnabled: true,
      bevelThickness: TOMB_BEVEL,
      bevelSize: TOMB_BEVEL,
      bevelSegments: 2,
      curveSegments: 32,
    });
    g.translate(0, 0, -TOMB_D / 2);
    return g;
  }, []);
  // Weathered granite: grain in the colour and in the surface.
  const grain = useMemo(() => {
    const t = noiseTexture(256, 8, 5, 0.3);
    t.repeat.set(0.6, 0.6);
    return t;
  }, []);
  useEffect(() => () => grain.dispose(), [grain]);
  const stone = useRef<THREE.Group>(null!);
  const carving = useRef<THREE.Group>(null!);
  const lines = useRef<(Line2 | null)[]>([]);
  const textRefs = useRef<{ fillOpacity: number }[]>([]);
  const rule = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(() => {
    const s = state.current;
    stone.current.rotation.z = s.tilt;
    stone.current.position.x = s.tremble ?? 0;
    carving.current.visible = s.carving > 0.01;
    textRefs.current.forEach((t) => t && (t.fillOpacity = s.carving));
    rule.current.opacity = s.carving;
    // Grow the crack one segment at a time, then its branches, as the app does.
    const k = s.cracked;
    const counts = [Math.round(k * 5), k > 0.5 ? 2 : 0, k > 0.7 ? 2 : 0];
    lines.current.forEach((line, i) => {
      if (!line) return;
      line.visible = counts[i]! > 0;
      line.geometry.instanceCount = counts[i]!;
    });
  });

  return (
    <group position={[x, 0, z]}>
      {/* The base stays flat on the ground: only the stone leans in it. */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[TOMB_W * 1.18, 0.5, TOMB_D * 1.5]} />
        <meshStandardMaterial color={palette.stone} map={grain} bumpMap={grain} bumpScale={4} roughness={0.92} />
      </mesh>
      <group ref={stone}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={palette.stone} map={grain} bumpMap={grain} bumpScale={4} roughness={0.92} />
        </mesh>
        <group ref={carving} position={[0, 0, TOMB_FRONT + 0.03]}>
          <Text
            ref={(t: { fillOpacity: number } | null) => void (textRefs.current[0] = t!)}
            font={FONT}
            fontSize={TOMB_W * 0.15}
            position={[0, TOMB_H * 0.68, 0]}
            color={palette.carve}
            anchorX="center"
            anchorY="middle"
          >
            R.I.P.
          </Text>
          <Text
            ref={(t: { fillOpacity: number } | null) => void (textRefs.current[1] = t!)}
            font={FONT}
            fontSize={TOMB_W * 0.3}
            position={[0, TOMB_H * 0.44, 0]}
            color={palette.carve}
            anchorX="center"
            anchorY="middle"
          >
            DPI
          </Text>
          <mesh position={[0, TOMB_H * 0.3, 0]}>
            <planeGeometry args={[TOMB_W * 0.44, 0.08]} />
            <meshStandardMaterial ref={rule} color={palette.carve} transparent />
          </mesh>
        </group>
        {[CRACK, BRANCH_A, BRANCH_B].map((list, i) => (
          <Line
            key={i}
            ref={(l) => void (lines.current[i] = l as Line2 | null)}
            points={crackPoints(list)}
            color={palette.carve}
            lineWidth={i === 0 ? 3 : 2}
          />
        ))}
      </group>
    </group>
  );
}
