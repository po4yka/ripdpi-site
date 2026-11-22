import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { arc, hash, noiseTexture, usePalette, useSceneTime } from "./kit";

const FROM = -30;
const TO = 167;

/** Where the moon stands in the sky, as a direction from the viewer. The moonlight comes from it. */
export const MOON_DIR = new THREE.Vector3(0.42, 0.36, -0.83).normalize();

/**
 * Where the moon is drawn on a portrait screen, which is too narrow to see `MOON_DIR`: nearer the middle, in the
 * clear sky between the header and the caption. Only the picture moves; the light keeps its direction.
 */
const MOON_DIR_TALL = new THREE.Vector3(0.09, 0.33, -0.94).normalize();

/** The crescent: the moon's disc less the disc of its dark side, as one shape, so the halo shows in the dark. */
function crescent(): THREE.ShapeGeometry {
  const [R, r, dx, dy] = [4.2, 3.6, 1.9, 1.1];
  const d = Math.hypot(dx, dy);
  const turn = Math.atan2(dy, dx);
  // Where the two circles cross, along the line between their centres.
  const a = (R * R - r * r + d * d) / (2 * d);
  const lit = Math.acos(a / R);
  const dark = Math.acos((a - d) / r);
  const s = new THREE.Shape();
  s.absarc(0, 0, R, turn + lit, turn - lit + 2 * Math.PI, false);
  s.absarc(dx, dy, r, turn - dark, turn + dark - 2 * Math.PI, true);
  return new THREE.ShapeGeometry(s, 48);
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
    g.setAttribute("seed", new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => hash(i + 600)), 1));
    return g;
  }, []);
  // Most stars are small and dim, a few are large and bright; each twinkles at its own pace.
  const starMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { color: { value: palette.nightLight }, time: { value: 0 }, dpr: { value: 1 } },
        vertexShader:
          "attribute float seed; uniform float time; uniform float dpr; varying float vLight; void main() { float big = pow(seed, 5.0); vLight = (0.3 + 0.7 * big) * (0.8 + 0.2 * sin(time * (0.6 + seed * 1.7) + seed * 40.0)); gl_PointSize = (1.2 + 2.4 * big) * dpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader:
          "uniform vec3 color; varying float vLight; void main() { float edge = 1.0 - smoothstep(0.25, 0.5, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(color, vLight * edge);\n#include <colorspace_fragment>\n}",
      }),
    [palette],
  );
  const moonShape = useMemo(() => crescent(), []);
  const halo = useMemo(() => radialTexture(), []);
  useEffect(
    () => () => (
      material.dispose(), stars.dispose(), starMaterial.dispose(), moonShape.dispose(), halo.dispose(), shaft.dispose(), shaftGeometry.dispose()
    ),
    [material, stars, starMaterial, moonShape, halo, shaft, shaftGeometry],
  );
  useFrame(({ camera, gl }) => {
    group.current.position.copy(camera.position);
    starMaterial.uniforms.time!.value = time.current;
    starMaterial.uniforms.dpr!.value = gl.getPixelRatio();
    // The shafts breathe, each at its own pace, as thin cloud passes the moon.
    shafts.current.forEach((m, i) => m && (m.opacity = 0.05 + 0.025 * Math.sin(time.current * (0.21 + i * 0.07) + i * 1.9)));
  });

  const tall = useThree((s) => s.size.width < s.size.height);
  const dir = tall ? MOON_DIR_TALL : MOON_DIR;
  const moon = dir.clone().multiplyScalar(80);
  return (
    <group ref={group} userData={{ noShadow: true }}>
      <mesh material={material} renderOrder={-2}>
        <sphereGeometry args={[90, 32, 16]} />
      </mesh>
      <points geometry={stars} material={starMaterial} renderOrder={-1} />
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
        <mesh renderOrder={-1} geometry={moonShape}>
          <meshBasicMaterial color={palette.nightLight.clone().multiplyScalar(1.5)} fog={false} depthWrite={false} toneMapped={false} />
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
    // The noise is flat along the lines of its lattice, and the moon shows them as rows. Add the same grain at two
    // other turns; whole-number turns keep the tile seamless.
    const g = (t.image as HTMLCanvasElement).getContext("2d")!;
    const img = g.getImageData(0, 0, 256, 256);
    const n = Uint8Array.from({ length: 256 * 256 }, (_, i) => img.data[i * 4]!);
    const at = (x: number, y: number) => n[(y & 255) * 256 + (x & 255)]!;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) img.data.fill((at(x, y) + at(2 * x + y, 2 * y - x) + at(x - y, x + y)) / 3, (y * 256 + x) * 4, (y * 256 + x) * 4 + 3);
    g.putImageData(img, 0, 0);
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
  const time = useSceneTime();
  const blades = useRef<THREE.InstancedMesh>(null!);
  const count = 4200;
  // Each blade bends to one side, more toward its tip, and the wind moves the tips. The matrix gives its height.
  const sway = useMemo(() => ({ value: 0 }), []);
  const bend = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSway = sway;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uSway;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nfloat up = position.y + 0.5; transformed.x += up * up * length(instanceMatrix[1].xyz) * (0.45 + 0.12 * sin(uSway * 1.3 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.6));",
      );
  };
  useFrame(() => void (sway.value = time.current));
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
      {/* Three rows carry the bend; the base stands in the ground, so it needs no cap. */}
      <coneGeometry args={[0.035, 1, 3, 3, true]} />
      <meshStandardMaterial roughness={0.9} onBeforeCompile={bend} />
    </instancedMesh>
  );
}

/** The low graveyard fence along the back of the whole route (SceneParts.kt fence), in iron. */
export function Fence() {
  const palette = usePalette();
  const pickets = useRef<THREE.InstancedMesh>(null!);
  const tips = useRef<THREE.InstancedMesh>(null!);
  const posts = useRef<THREE.InstancedMesh>(null!);
  const count = Math.floor((TO - FROM) / 0.6);
  const postCount = Math.floor(count / 10);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const top = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const h = 1.5 + (i % 5 === 0 ? 0.4 : 0) + hash(i) * 0.1;
      // A picket leans now and then: the fence is old.
      m.makeRotationZ((hash(i + 50) - 0.5) * (i % 7 === 3 ? 0.25 : 0.04));
      // Its spear tip stands on its top end and leans with it.
      top.set(0, h / 2 + 0.11, 0).applyMatrix4(m);
      tips.current.setMatrixAt(i, m.clone().setPosition(FROM + i * 0.6 + top.x, h / 2 + top.y, -7));
      pickets.current.setMatrixAt(i, m.scale(new THREE.Vector3(1, h, 1)).setPosition(FROM + i * 0.6, h / 2, -7));
    }
    // A square post between the pickets, every six units.
    for (let i = 0; i < postCount; i++) posts.current.setMatrixAt(i, m.makeTranslation(FROM + i * 6 + 0.3, 1.05, -7));
    for (const mesh of [pickets, tips, posts]) mesh.current.instanceMatrix.needsUpdate = true;
  }, [count, postCount]);
  return (
    <group>
      <instancedMesh ref={pickets} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.035, 0.045, 1, 5]} />
        <meshStandardMaterial color={palette.ink} roughness={0.6} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={tips} args={[undefined, undefined, count]} frustumCulled={false}>
        <coneGeometry args={[0.07, 0.22, 4]} />
        <meshStandardMaterial color={palette.ink} roughness={0.6} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={posts} args={[undefined, undefined, postCount]} frustumCulled={false}>
        <boxGeometry args={[0.14, 2.1, 0.14]} />
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
export function Tree({ x, z = -3, scale = 1, seed = 7, far = false }: { x: number; z?: number; scale?: number; seed?: number; far?: boolean }) {
  const palette = usePalette();
  // One geometry for the whole tree: a cylinder for each branch and a ball at each fork, which closes the joint.
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const m = new THREE.Matrix4();
    const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, seed: number) => {
      const to = from.clone().addScaledVector(dir, len);
      m.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir)).setPosition(from.clone().add(to).multiplyScalar(0.5));
      parts.push(new THREE.CylinderGeometry(r * 0.62, r, len, 6).applyMatrix4(m));
      parts.push(new THREE.SphereGeometry(r * 0.62, 6, 4).translate(to.x, to.y, to.z));
      if (depth === 0) return;
      [-1, 1].forEach((side, k) => {
        const axis = new THREE.Vector3(hash(seed + 11) - 0.5, 0, 1).normalize();
        const d = dir.clone().applyAxisAngle(axis, side * (0.35 + hash(seed + k) * 0.45)).normalize();
        grow(to, d, len * (0.6 + hash(seed + k + 5) * 0.15), r * 0.62, depth - 1, seed * 3 + k);
      });
    };
    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 1, 0).normalize(), 2.6, 0.18, 5, seed);
    const tree = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return tree;
  }, [seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[x, 0, z]} scale={scale} userData={{ noCast: far }}>
      <meshStandardMaterial color={palette.ink} roughness={1} />
    </mesh>
  );
}

/** Where the far trees stand, behind the fence and the captions, between the stations: x, z, scale. */
const GROVE = [
  [13, -15, 1.2],
  [27, -17, 1.4],
  [45, -14, 1.1],
  [63, -18, 1.5],
  [81, -15, 1.2],
  [102, -17, 1.3],
  [121, -14.5, 1.2],
  [146, -17, 1.4],
] as const;

/** The far trees: each of its own shape, silhouettes in the fog that slide past more slowly than the stations. */
export function Grove() {
  return GROVE.map(([x, z, scale], i) => <Tree key={x} x={x} z={z} scale={scale} seed={11 + i * 13} far />);
}

/** The two hills of the app's backdrop (SceneProps.kt hill), far behind the fence: flat shapes that the fog takes. */
const HILLS = [
  { z: -40, base: 5, amp: 3, length: 15, phase: 1 },
  { z: -27, base: 2.4, amp: 1.7, length: 10, phase: 3 },
];

export function Hills() {
  const palette = usePalette();
  const shapes = useMemo(
    () =>
      HILLS.map(({ base, amp, length, phase }) => {
        const s = new THREE.Shape().moveTo(FROM - 40, 0);
        for (let x = FROM - 40; x <= TO + 40; x += 2)
          s.lineTo(x, base + amp * Math.sin(x / length + phase) + amp * 0.4 * Math.sin((x / length) * 2.3 + phase * 2));
        return new THREE.ShapeGeometry(s.lineTo(TO + 40, 0));
      }),
    [],
  );
  useEffect(() => () => shapes.forEach((s) => s.dispose()), [shapes]);
  return (
    <group userData={{ noShadow: true }}>
      {HILLS.map(({ z }, i) => (
        <mesh key={z} geometry={shapes[i]} position-z={z}>
          <meshBasicMaterial color={palette.night} />
        </mesh>
      ))}
    </group>
  );
}

/** Dust in the moonlight: a few motes that hang over the route and drift, each on its own slow path. */
export function Dust() {
  const palette = usePalette();
  const time = useSceneTime();
  const geometry = useMemo(() => {
    const n = 320;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([FROM + hash(i + 40) * (TO - FROM), 0.4 + hash(i + 41000) * 6, -6 + hash(i + 42000) * 11], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => hash(i + 43000)), 1));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { color: { value: palette.nightLight }, time: { value: 0 }, dpr: { value: 1 } },
        vertexShader:
          "attribute float seed; uniform float time; uniform float dpr; varying float vLight; void main() { vec3 p = position + vec3(sin(time * 0.13 + seed * 50.0) * 0.6, sin(time * 0.1 + seed * 80.0) * 0.3, cos(time * 0.11 + seed * 30.0) * 0.5); vec4 mv = modelViewMatrix * vec4(p, 1.0); vLight = 0.32 * (0.6 + 0.4 * sin(time * 0.5 + seed * 60.0)) * smoothstep(55.0, 25.0, -mv.z); gl_PointSize = max(1.0, 34.0 / -mv.z) * dpr; gl_Position = projectionMatrix * mv; }",
        fragmentShader:
          "uniform vec3 color; varying float vLight; void main() { float edge = 1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(color, vLight * edge);\n#include <colorspace_fragment>\n}",
      }),
    [palette],
  );
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);
  useFrame(({ gl }) => {
    material.uniforms.time!.value = time.current;
    material.uniforms.dpr!.value = gl.getPixelRatio();
  });
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
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
