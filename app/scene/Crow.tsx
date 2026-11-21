import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { usePalette } from "./kit";

export interface CrowState {
  position: THREE.Vector3;
  /** 0 on the stone; above 0 the wings beat. */
  flying: number;
  head: number;
  visible: boolean;
}

/**
 * The crow of the welcome scene (SceneProps.kt): it comes down on beating wings, lands on the stone and folds
 * them along its back. It faces the way it flies, toward +x.
 */
export function Crow({ state, time }: { state: { current: CrowState }; time: { current: number } }) {
  const palette = usePalette();
  const group = useRef<THREE.Group>(null!);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const head = useRef<THREE.Group>(null!);
  const folded = useRef(1);
  // A wing, flat, from its root at the origin to its tip along +y.
  const wing = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.4, 0);
    s.lineTo(0.45, 0);
    s.quadraticCurveTo(0.5, 0.8, 0.1, 1.45);
    s.quadraticCurveTo(-0.3, 1.1, -0.4, 0);
    return new THREE.ShapeGeometry(s, 6);
  }, []);

  useFrame((frame, delta) => {
    // A scene that draws only on scroll (reduced motion) has no frames to ease over: there the pose is set.
    const ease = (from: number, to: number, rate: number) =>
      frame.frameloop === "always" ? THREE.MathUtils.damp(from, to, rate, delta) : to;
    const s = state.current;
    group.current.visible = s.visible;
    if (!s.visible) return;
    group.current.position.copy(s.position);
    folded.current = ease(folded.current, s.flying > 0 ? 0 : 1, 9);
    const f = folded.current;
    const lift = (1 - f) * (0.25 + 0.85 * Math.sin(time.current * 26)) + f * 0.12;
    wings.current.forEach((w, i) => {
      if (!w) return;
      const side = i === 0 ? 1 : -1;
      // Open, the wing stands out from the body and beats; folded, it lies back along the body.
      w.rotation.y = side * f * 1.32;
      w.children[0]!.rotation.x = side * (Math.PI / 2 - lift);
      w.scale.setScalar(1 - f * 0.3);
    });
    // The body pitches up as it brakes to land.
    group.current.rotation.z = (1 - f) * 0.25;
    head.current.rotation.y = ease(head.current.rotation.y, s.head * 0.8, 14);
  });

  const ink = <meshStandardMaterial color={palette.ink} roughness={0.5} />;
  return (
    <group ref={group} scale={0.55}>
      <mesh scale={[1.15, 0.62, 0.6]} rotation-z={0.2}>
        <sphereGeometry args={[0.6, 20, 14]} />
        {ink}
      </mesh>
      {/* The tail: a wedge, wide at its end. */}
      <mesh position={[-0.95, -0.02, 0]} rotation={[0, 0, Math.PI / 2 + 0.25]} scale={[0.5, 1, 1.9]}>
        <coneGeometry args={[0.2, 0.8, 4]} />
        {ink}
      </mesh>
      <group ref={head} position={[0.58, 0.44, 0]}>
        <mesh>
          <sphereGeometry args={[0.3, 16, 12]} />
          {ink}
        </mesh>
        <mesh position={[0.4, -0.05, 0]} rotation-z={-Math.PI / 2} scale={[1, 1, 0.7]}>
          <coneGeometry args={[0.11, 0.46, 8]} />
          {ink}
        </mesh>
        {[0.25, -0.25].map((zz) => (
          <mesh key={zz} position={[0.15, 0.06, zz]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshBasicMaterial color={palette.paper} />
          </mesh>
        ))}
      </group>
      {[0.2, -0.2].map((zz, i) => (
        <group key={zz} ref={(g) => void (wings.current[i] = g)} position={[0.05, 0.2, zz]}>
          <mesh geometry={wing}>
            <meshStandardMaterial color={palette.ink} roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[0.12, -0.12].map((zz) => (
        <mesh key={zz} position={[0.05, -0.5, zz]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 5]} />
          {ink}
        </mesh>
      ))}
    </group>
  );
}
