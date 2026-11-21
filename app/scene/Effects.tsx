import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { hash } from "./kit";

const MAX = 96;

interface Bit {
  life: number;
  span: number;
  size: number;
  gravity: number;
  at: THREE.Vector3;
  speed: THREE.Vector3;
  color: THREE.Color;
}

const bits: Bit[] = Array.from({ length: MAX }, () => ({
  life: 0,
  span: 1,
  size: 0,
  gravity: 0,
  at: new THREE.Vector3(),
  speed: new THREE.Vector3(),
  color: new THREE.Color(),
}));
let next = 0;
// Only a running scene throws bits: under reduced motion nothing would carry them on.
let running = false;

/**
 * Throws `count` bits from a place, as the app's sparks, chips and dust (SceneParts.kt): sparks have no weight and
 * die in the air; chips and dust fall and rest on the ground.
 */
export function burst(
  at: THREE.Vector3,
  color: THREE.Color,
  count: number,
  { speed = 2.5, size = 0.09, gravity = 0, span = 0.7 }: { speed?: number; size?: number; gravity?: number; span?: number } = {},
): void {
  if (!running) return;
  for (let k = 0; k < count; k++) {
    const b = bits[next]!;
    next = (next + 1) % MAX;
    const turn = hash(next * 3.1 + k) * Math.PI * 2;
    const lift = hash(next * 7.7 + k);
    b.at.copy(at);
    b.speed.set(Math.cos(turn) * speed * (0.4 + lift * 0.6), (0.3 + lift) * speed * 0.8, Math.sin(turn) * speed * 0.4);
    b.life = b.span = span * (0.7 + hash(next + k * 13) * 0.6);
    b.size = size;
    b.gravity = gravity;
    b.color.copy(color);
  }
}

/** Draws the bits that `burst` throws. One instanced mesh for the whole route. */
export function Bursts() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const animate = useThree((s) => s.frameloop === "always");
  useEffect(() => {
    running = animate;
    return () => void (running = false);
  }, [animate]);

  useFrame((_, delta) => {
    // A tab that comes back from the background must not throw the bits across the scene.
    const dt = Math.min(delta, 0.05);
    bits.forEach((b, i) => {
      let scale = 0;
      if (b.life > 0) {
        b.life -= dt;
        b.speed.y -= b.gravity * dt;
        b.at.addScaledVector(b.speed, dt);
        if (b.at.y < b.size) {
          b.at.y = b.size;
          b.speed.set(0, 0, 0);
        }
        scale = b.size * Math.max(0, b.life / b.span) ** 0.5;
        mesh.current.setColorAt(i, b.color);
      }
      mesh.current.setMatrixAt(i, m.makeScale(scale, scale, scale).setPosition(b.at));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false} userData={{ noShadow: true }}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** True on the frame where `now` first reaches `mark` on its way up. `was` keeps the value of the frame before. */
export function crossed(was: { current: number }, now: number, mark: number): boolean {
  const hit = was.current < mark && now >= mark;
  was.current = now;
  return hit;
}
