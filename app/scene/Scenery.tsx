import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { arc, hash, noiseTexture, smoothstep, usePalette, useSceneTime } from "./kit";

const FROM = -30;
const TO = 125;

/** Where the moon stands in the sky, as a direction from the viewer. The moonlight comes from it. */
export const MOON_DIR = new THREE.Vector3(0.42, 0.36, -0.83).normalize();

/**
 * Where the moon is drawn on a portrait screen, which is too narrow to see `MOON_DIR`: nearer the middle, in the
 * clear sky between the header and the caption. Only the picture moves; the light keeps its direction.
 */
const MOON_DIR_TALL = new THREE.Vector3(0.09, 0.33, -0.94).normalize();

/** The sky colour along a view direction: the horizon tone low, the night above. Shared by the dome and the moon. */
function skyShare(y: number): number {
  return smoothstep(-0.05, 0.4, y);
}

/** The shafts of moonlight: which way each falls from the moon (0 is straight down), how wide and how long. */
const SHAFTS = [
  { turn: -1.05, w: 7, len: 62 },
  { turn: -0.72, w: 11, len: 70 },
  { turn: -0.42, w: 6, len: 58 },
  { turn: -0.12, w: 9, len: 52 },
];

/** One shaft: clear at the moon, brightest a little below it, gone at its far end, soft at both sides. */
function shaftTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  const along = g.createLinearGradient(0, 0, 0, 256);
  along.addColorStop(0, "rgba(255,255,255,0)");
  along.addColorStop(0.12, "rgba(255,255,255,1)");
  along.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = along;
  g.fillRect(0, 0, 64, 256);
  const across = g.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, "rgba(255,255,255,0)");
  across.addColorStop(0.5, "rgba(255,255,255,1)");
  across.addColorStop(1, "rgba(255,255,255,0)");
  g.globalCompositeOperation = "destination-in";
  g.fillStyle = across;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(canvas);
}

/**
 * The night sky that travels with the camera: a gradient dome, stars and the crescent moon of the app's night scene,
 * with a soft halo.
 */
export function Sky() {
  const palette = usePalette();
  const time = useSceneTime();
  const group = useRef<THREE.Group>(null!);
  const shafts = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const shaft = useMemo(() => shaftTexture(), []);
  const shaftGeometry = useMemo(() => new THREE.PlaneGeometry().translate(0, -0.5, 0), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: palette.sky }, bottom: { value: arc.horizon } },
        vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader:
          "uniform vec3 top; uniform vec3 bottom; varying vec3 vDir; void main() { float s = smoothstep(-0.05, 0.4, vDir.y); gl_FragColor = vec4(mix(bottom, top, s), 1.0);\n#include <colorspace_fragment>\n}",
      }),
    [palette],
  );
  const stars = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = hash(i) * Math.PI * 2;
      const y = 0.08 + hash(i + 300) ** 1.6 * 0.9;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 85, y * 85, Math.sin(a) * r * 85], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const halo = useMemo(() => radialTexture(), []);
  useEffect(
    () => () => (material.dispose(), stars.dispose(), halo.dispose(), shaft.dispose(), shaftGeometry.dispose()),
    [material, stars, halo, shaft, shaftGeometry],
  );
  useFrame(({ camera }) => {
    group.current.position.copy(camera.position);
    // The shafts breathe, each at its own pace, as thin cloud passes the moon.
    shafts.current.forEach((m, i) => m && (m.opacity = 0.05 + 0.025 * Math.sin(time.current * (0.21 + i * 0.07) + i * 1.9)));
  });

  const tall = useThree((s) => s.size.width < s.size.height);
  const dir = tall ? MOON_DIR_TALL : MOON_DIR;
  const moon = dir.clone().multiplyScalar(80);
  const shade = palette.horizon.clone().lerp(palette.sky, skyShare(dir.y));
  return (
    <group ref={group} userData={{ noShadow: true }}>
      <mesh material={material} renderOrder={-2}>
        <sphereGeometry args={[90, 32, 16]} />
      </mesh>
      <points geometry={stars} renderOrder={-1}>
        <pointsMaterial color={palette.nightLight} size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.75} depthWrite={false} />
      </points>
      <group
        position={moon}
        quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate())}
        scale={tall ? 0.6 : 1}
      >
        <mesh renderOrder={-1} scale={26}>
          <planeGeometry />
          <meshBasicMaterial map={halo} color={palette.nightLight} transparent opacity={0.16} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        {SHAFTS.map((s, i) => (
          // Each starts clear of the moon's disc, so the dark of the crescent stays dark.
          <group key={i} rotation-z={s.turn}>
            <mesh geometry={shaftGeometry} position={[0, -5, -0.02]} scale={[s.w, s.len, 1]} renderOrder={-1}>
              <meshBasicMaterial
                ref={(m) => void (shafts.current[i] = m)}
                map={shaft}
                color={palette.nightLight}
                transparent
                opacity={0.05}
                fog={false}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        ))}
        <mesh renderOrder={-1}>
          <circleGeometry args={[4.2, 64]} />
          <meshBasicMaterial color={palette.nightLight.clone().multiplyScalar(1.5)} fog={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh renderOrder={-1} position={[1.9, 1.1, 0.01]}>
          <circleGeometry args={[3.6, 64]} />
          <meshBasicMaterial color={shade} fog={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** A soft round falloff, white to clear: halos of the moon and the ghosts. */
export function radialTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** The ground of the whole route: soil with grain, which takes the shadows of the moon. */
export function Ground() {
  const palette = usePalette();
  const map = useMemo(() => {
    const t = noiseTexture(256, 16, 3, 0.5);
    t.repeat.set(40, 40);
    return t;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    // Deep toward the camera too: on portrait screens the camera backs off.
    <mesh rotation-x={-Math.PI / 2} position={[(FROM + TO) / 2, 0, 10]} userData={{ noCast: true }}>
      <planeGeometry args={[TO - FROM + 60, 160]} />
      <meshStandardMaterial color={palette.ground} map={map} bumpMap={map} bumpScale={3} roughness={0.7} />
    </mesh>
  );
}

/** Tufts of dry grass along the route: they catch the moon at their tips. */
export function Grass() {
  const palette = usePalette();
  const blades = useRef<THREE.InstancedMesh>(null!);
  const count = 4200;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Clumps: a few blades around each of a set of centres.
      const clump = Math.floor(i / 6);
      const cx = FROM + hash(clump) * (TO - FROM);
      const cz = -7 + hash(clump + 7000) ** 0.8 * 16;
      const h = 0.25 + hash(i + 2000) * 0.55;
      e.set((hash(i + 3000) - 0.5) * 0.7, hash(i + 4000) * 3, (hash(i + 5000) - 0.5) * 0.7);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(cx + (hash(i + 6000) - 0.5) * 0.7, h / 2, cz + (hash(i + 8000) - 0.5) * 0.5), q, new THREE.Vector3(1, h, 1));
      blades.current.setMatrixAt(i, m);
      blades.current.setColorAt(i, c.copy(palette.ink).lerp(palette.stone, hash(i + 9000) * 0.5));
    }
    blades.current.instanceMatrix.needsUpdate = true;
    if (blades.current.instanceColor) blades.current.instanceColor.needsUpdate = true;
  }, [palette]);
  return (
    <instancedMesh ref={blades} args={[undefined, undefined, count]} frustumCulled={false} userData={{ noCast: true }}>
      <coneGeometry args={[0.035, 1, 3]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

/** The low graveyard fence along the back of the whole route (SceneParts.kt fence), in iron. */
export function Fence() {
  const palette = usePalette();
  const pickets = useRef<THREE.InstancedMesh>(null!);
  const count = Math.floor((TO - FROM) / 0.6);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const h = 1.5 + (i % 5 === 0 ? 0.4 : 0) + hash(i) * 0.1;
      // A picket leans now and then: the fence is old.
      m.makeRotationZ((hash(i + 50) - 0.5) * (i % 7 === 3 ? 0.25 : 0.04)).scale(new THREE.Vector3(1, h, 1)).setPosition(FROM + i * 0.6, h / 2, -7);
      pickets.current.setMatrixAt(i, m);
    }
    pickets.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <group>
      <instancedMesh ref={pickets} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.035, 0.045, 1, 5]} />
        <meshStandardMaterial color={palette.ink} roughness={0.6} metalness={0.4} />
      </instancedMesh>
      {[0.35, 1.25].map((y) => (
        <mesh key={y} position={[(FROM + TO) / 2, y, -7]}>
          <boxGeometry args={[TO - FROM, 0.05, 0.05]} />
          <meshStandardMaterial color={palette.ink} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** A bare tree, as in the welcome and night scenes: a trunk and forked branches, a silhouette against the sky. */
export function Tree({ x, z = -3, scale = 1 }: { x: number; z?: number; scale?: number }) {
  const palette = usePalette();
  const branches = useMemo(() => {
    const out: { from: THREE.Vector3; to: THREE.Vector3; r: number }[] = [];
    const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, seed: number) => {
      const to = from.clone().addScaledVector(dir, len);
      out.push({ from, to, r });
      if (depth === 0) return;
      [-1, 1].forEach((side, k) => {
        const axis = new THREE.Vector3(hash(seed + 11) - 0.5, 0, 1).normalize();
        const d = dir.clone().applyAxisAngle(axis, side * (0.35 + hash(seed + k) * 0.45)).normalize();
        grow(to, d, len * (0.6 + hash(seed + k + 5) * 0.15), r * 0.62, depth - 1, seed * 3 + k);
      });
    };
    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 1, 0).normalize(), 2.6, 0.18, 5, 7);
    return out;
  }, []);
  return (
    <group position={[x, 0, z]} scale={scale}>
      {branches.map(({ from, to, r }, i) => {
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const len = from.distanceTo(to);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        return (
          <mesh key={i} position={mid} quaternion={q}>
            <cylinderGeometry args={[r * 0.62, r, len * 1.04, 6]} />
            <meshStandardMaterial color={palette.ink} roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Bands of ground mist that drift along the route, between the stations and the camera. */
export function Mist() {
  const palette = usePalette();
  const time = useSceneTime();
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const g = canvas.getContext("2d")!;
    for (let i = 0; i < 70; i++) {
      const x = hash(i) * 512;
      const y = 64 + (hash(i + 100) - 0.5) * 50;
      const r = 30 + hash(i + 200) * 60;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.22)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      // Draw thrice so the band tiles across its left and right edges.
      for (const dx of [-512, 0, 512]) g.fillRect(x - r + dx, y - r, 2 * r, 2 * r);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const layers = useMemo(
    () => [
      { z: -5, y: 1.2, h: 3.5, o: 0.1, speed: 0.004 },
      { z: -1.5, y: 0.5, h: 1.8, o: 0.09, speed: 0.007 },
      { z: 3.5, y: 0.25, h: 1.2, o: 0.08, speed: 0.01 },
    ],
    [],
  );
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame(() => {
    mats.current.forEach((m, i) => {
      if (!m?.map) return;
      m.color.copy(arc.tint);
      m.map.offset.x = time.current * layers[i]!.speed;
    });
  });
  return (
    <group userData={{ noShadow: true }}>
      {layers.map((l, i) => (
        <mesh key={i} position={[(FROM + TO) / 2, l.y, l.z]} renderOrder={1}>
          <planeGeometry args={[TO - FROM, l.h]} />
          <meshBasicMaterial
            ref={(m) => void (mats.current[i] = m)}
            map={texture.clone()}
            map-repeat={[(TO - FROM) / 18, 1]}
            color={palette.nightLight}
            transparent
            opacity={l.o}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const PACKETS = 8;
const SPAN = 48;
// Behind the props: the ground in front of them is under the foot of the frame.
const CABLE_Z = -1.6;

/**
 * The line of the whole route, on the ground behind the stations. It is dead until the tap; then it carries
 * the signal, and packets run along it past the camera.
 */
export function Cable() {
  const palette = usePalette();
  const time = useSceneTime();
  const line = useRef<THREE.MeshBasicMaterial>(null!);
  const packets = useRef<THREE.InstancedMesh>(null!);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ camera }) => {
    line.current.color.copy(palette.ink).lerp(palette.signalGlow, arc.signal);
    packets.current.visible = arc.signal > 0;
    // The packets keep their places in the world; only the stretch near the camera is drawn.
    const from = camera.position.x - SPAN / 2;
    for (let i = 0; i < PACKETS; i++) {
      const x = time.current * 5 + (i * SPAN) / PACKETS - from;
      m.makeScale(arc.signal, arc.signal, arc.signal).setPosition(from + (((x % SPAN) + SPAN) % SPAN), 0.2, CABLE_Z);
      packets.current.setMatrixAt(i, m);
    }
    packets.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group userData={{ noShadow: true }}>
      <mesh position={[(FROM + TO) / 2, 0.05, CABLE_Z]}>
        <boxGeometry args={[TO - FROM, 0.09, 0.09]} />
        <meshBasicMaterial ref={line} color={palette.ink} toneMapped={false} />
      </mesh>
      <instancedMesh ref={packets} args={[undefined, undefined, PACKETS]} frustumCulled={false}>
        <boxGeometry args={[0.5, 0.3, 0.3]} />
        <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
