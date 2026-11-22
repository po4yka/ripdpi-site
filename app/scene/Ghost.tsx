import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { pointer, toPointer, usePalette, useSceneTime } from "./kit";
import { radialTexture } from "./Scenery";

/**
 * The sheet of the app icon's ghost, from SceneGhost.kt (sheetShape), in its 300x170 design units divided by 10.
 * Kotlin's y grows down; here y grows up and the hem sits at y = 0.
 */
function sheetOutline(): THREE.Shape {
  const p = (x: number, y: number) => [x / 10, -(y + 3) / 10] as const;
  const s = new THREE.Shape();
  s.moveTo(...p(-9.6, -22));
  s.quadraticCurveTo(...p(-9.9, -30.6), ...p(-5.2, -30.6));
  s.quadraticCurveTo(...p(-1.1, -30.6), ...p(-1.5, -24.6));
  s.quadraticCurveTo(...p(0, -22.4), ...p(1.5, -24.6));
  s.quadraticCurveTo(...p(1.1, -30.6), ...p(5.2, -30.6));
  s.quadraticCurveTo(...p(9.9, -30.6), ...p(9.6, -22));
  s.bezierCurveTo(...p(10.5, -14), ...p(12.8, -9), ...p(12.8, -3));
  // The hem: six scallops, alternately low and high, as in the app.
  for (let k = 1; k <= 6; k++) {
    const x = 12.8 - (k * 25.6) / 6;
    const x0 = 12.8 - ((k - 0.5) * 25.6) / 6;
    const peak = k % 2 === 1 ? 2.8 : -1.4;
    s.quadraticCurveTo(...p(x0, -3 + peak), ...p(x, -3));
  }
  s.bezierCurveTo(...p(-12.8, -9), ...p(-10.5, -14), ...p(-9.6, -22));
  return s;
}

const eyesAt = new THREE.Vector3();
const gaze = new THREE.Vector2();
const DEPTH = 0.35;
const BEVEL = 0.22;

const ghostKey = () => "ghost";
let sheetGeometry: THREE.ExtrudeGeometry | undefined;

/** One sheet for every ghost of the page: the shader moves its hem, so no ghost needs vertices of its own. */
function sheetShape(): THREE.ExtrudeGeometry {
  if (sheetGeometry) return sheetGeometry;
  sheetGeometry = new THREE.ExtrudeGeometry(sheetOutline(), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.16,
    bevelSegments: 4,
    curveSegments: 24,
  });
  sheetGeometry.translate(0, 0, -DEPTH / 2);
  return sheetGeometry;
}

/**
 * What a ghost adds to the standard material. The hem waves and trails behind the ghost, and the normals follow it,
 * so the moonlight on the hem stays right. A phased ghost shows only where the eye looks along its surface: an
 * outline, as the dashed ghost of the app.
 */
function ghostShader(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: Record<string, THREE.IUniform>): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uLag; uniform float uWave; uniform float uTurn;")
    .replace(
      "#include <beginnormal_vertex>",
      `#include <beginnormal_vertex>
      float hemAt = uTurn + position.x * 4.2;
      float hem = max(0.0, 1.0 - position.y / 0.9);
      float hemSlope = position.y < 0.9 ? -1.0 / 0.9 : 0.0;
      mat3 hemMove = mat3(1.0, hem * uWave * 4.2 * cos(hemAt), 0.0, -uLag * 0.4 * hemSlope, 1.0 + hemSlope * uWave * sin(hemAt), 0.0, 0.0, 0.0, 1.0);
      objectNormal = normalize(transpose(inverse(hemMove)) * objectNormal);`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      transformed.x -= uLag * 0.4 * hem;
      transformed.y += hem * uWave * sin(hemAt);`,
    );
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uPhase;").replace(
    "#include <tonemapping_fragment>",
    `float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.5);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, diffuse, uPhase * 0.7);
    gl_FragColor.a *= mix(1.0, 0.04 + 0.96 * rim, uPhase);
    #include <tonemapping_fragment>`,
  );
}

export interface GhostState {
  position: THREE.Vector3;
  scale: number;
  /** Direction and share of speed, -1..1: the ghost leans into its motion and its hem trails. */
  lag: number;
  /** 0 is solid; 1 is a faint outline that passes through things. */
  phase: number;
  /** Where the eyes look, -1..1. */
  look: number;
  /** Crossed eyes, for a ghost that a scanner caught. */
  crossed: boolean;
  visible: boolean;
  still: boolean;
  /** 1 is there; 0 is gone. A ghost comes and goes by this, not by a cut. What it carries, its glow and its light do not fade. */
  fade: number;
  /** How open the eyes are: 1 open, about 0.45 narrow. */
  open: number;
}

/** A ghost's state, owned by the station that drives it and mutated in that station's useFrame. */
export function useGhostState(init: Partial<Omit<GhostState, "position">> & { position: [number, number, number] }) {
  return useRef<GhostState>({
    scale: 1,
    lag: 0,
    phase: 0,
    look: 0,
    crossed: false,
    visible: true,
    still: false,
    fade: 1,
    open: 1,
    ...init,
    position: new THREE.Vector3(...init.position),
  });
}

/**
 * The ghost: two tall eyes and a sheet with a wavy hem. It floats, leans into its motion and blinks. It does not
 * jump (SceneGhost.kt).
 */
export function Ghost({
  state,
  id = 0,
  glow = 0,
  light = false,
  children,
}: {
  /** What the ghost carries: it floats, leans and bobs with the ghost. In the ghost's own units, y up from the hem. */
  children?: React.ReactNode;
  state: { current: GhostState };
  id?: number;
  /** A signal-coloured glow behind the ghost, 0..1. */
  glow?: number;
  /** The ghost lights the ground around it. */
  light?: boolean;
}) {
  const palette = usePalette();
  const time = useSceneTime();
  const geometry = useMemo(() => sheetShape(), []);
  const uniforms = useMemo(() => ({ uLag: { value: 0 }, uWave: { value: 0 }, uTurn: { value: 0 }, uPhase: { value: 0 } }), []);
  const compile = useMemo(() => (shader: THREE.WebGLProgramParametersWithUniforms) => ghostShader(shader, uniforms), [uniforms]);
  const halo = useMemo(() => radialTexture(), []);
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const sheet = useRef<THREE.MeshStandardMaterial>(null!);
  const aura = useRef<THREE.MeshBasicMaterial>(null!);
  const eyes = useRef<THREE.Group>(null!);
  const crossed = useRef<THREE.Group>(null!);
  const lean = useRef(0);

  useFrame((frame, delta) => {
    const s = state.current;
    group.current.visible = s.visible && s.fade > 0.01;
    if (!group.current.visible) return;
    const t = time.current;
    // The lean follows the station's value over a moment, so a ghost that starts or stops does not snap.
    // A scene that draws only on scroll (reduced motion) has no frames to ease over: there the lean is set.
    const want = Math.max(-1, Math.min(1, s.lag));
    lean.current = frame.frameloop === "always" ? THREE.MathUtils.damp(lean.current, want, 5, delta) : want;
    const lag = lean.current;
    const speed = Math.abs(lag);

    group.current.position.copy(s.position);
    group.current.scale.setScalar(s.scale);
    body.current.position.y = s.still ? 0 : Math.sin(t * 1.7 + id * 2.1) * 0.17;
    body.current.rotation.z = -lag * 0.14;
    body.current.scale.set(1 + speed * 0.05, 1 - speed * 0.05, 1);

    // The hem waves, faster when the ghost moves, and trails behind it (see `ghostShader`).
    uniforms.uLag.value = lag;
    uniforms.uWave.value = 0.07 + speed * 0.06;
    uniforms.uTurn.value = t * (3 + speed * 4) + id;

    // Phasing: the sheet empties to its outline, as the dashed ghost does in the app.
    uniforms.uPhase.value = s.phase;
    sheet.current.opacity = s.fade;
    const clear = s.fade < 0.99 || s.phase > 0.01;
    if (sheet.current.transparent !== clear) {
      sheet.current.transparent = clear;
      // three.js compiles opacity out of an opaque material, so the shader must change with the flag.
      sheet.current.needsUpdate = true;
    }
    // An outline passes through things: it shows over the wall or the stone it is in, eyes and all.
    const solid = s.phase < 0.5;
    sheet.current.depthWrite = solid;
    sheet.current.depthTest = solid;
    eyes.current.renderOrder = solid ? 0 : 1;
    eyes.current.children.forEach((eye) => (((eye as THREE.Mesh).material as THREE.Material).depthTest = solid));
    aura.current.opacity = 0.1 * s.fade * (1 - s.phase * 0.7);

    // Blink now and then; look toward the motion.
    const blink = (t * 0.19 + id * 0.37) % 1 > 0.965 ? 0.12 : s.open;
    // The eyes open out of nothing as the ghost comes, so they do not appear by a cut.
    const shown = Math.min(1, Math.max(0, (s.fade - 0.3) / 0.5));
    eyes.current.visible = !s.crossed && shown > 0;
    crossed.current.visible = s.crossed;
    eyes.current.scale.set(shown, blink * shown, 1);
    // The eyes go to the reader's pointer while it moves; at rest they look where the ghost goes.
    const follow = pointer.idle < 4;
    if (follow) toPointer(frame, eyes.current.getWorldPosition(eyesAt), gaze).multiplyScalar(3).clampScalar(-1, 1);
    const e = eyes.current.position;
    e.x = THREE.MathUtils.damp(e.x, (follow ? gaze.x : s.look || lag) * 0.09, 10, delta);
    e.y = THREE.MathUtils.damp(e.y, 2.2 + (follow ? gaze.y * 0.07 : 0), 10, delta);
  });

  const front = DEPTH / 2 + BEVEL + 0.01;
  return (
    <group ref={group}>
      <group ref={body}>
        {/* The ghost's own pale aura, and the signal glow of the night ghost. */}
        <mesh position={[0, 1.4, -0.4]} scale={[5, 5, 1]} userData={{ noShadow: true }}>
          <planeGeometry />
          <meshBasicMaterial ref={aura} map={halo} color={palette.sheet} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        {glow > 0 && (
          <mesh position={[0, 1.4, -0.5]} scale={[5.5, 5.5, 1]} userData={{ noShadow: true }}>
            <planeGeometry />
            <meshBasicMaterial map={halo} color={palette.signal} transparent opacity={0.5 * glow} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )}
        {light && <pointLight position={[0, -0.1, 0.8]} color={palette.sheet} intensity={4} distance={7} decay={1.6} />}
        <mesh geometry={geometry}>
          <meshStandardMaterial
            ref={sheet}
            color={palette.sheet}
            emissive={palette.sheet}
            emissiveIntensity={0.28}
            roughness={0.85}
            onBeforeCompile={compile}
            // Every ghost compiles to the same program.
            customProgramCacheKey={ghostKey}
          />
        </mesh>
        <group ref={eyes} position={[0, 2.2, front]}>
          {[-0.52, 0.52].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={[0.155, 0.37, 0.06]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color={palette.eye} />
            </mesh>
          ))}
        </group>
        <group ref={crossed} position={[0, 2.2, front]}>
          {[-0.52, 0.52].flatMap((x) =>
            [1, -1].map((d) => (
              <mesh key={`${x}${d}`} position={[x, 0, 0]} rotation-z={d * 0.9}>
                <boxGeometry args={[0.5, 0.11, 0.05]} />
                <meshBasicMaterial color={palette.eye} />
              </mesh>
            )),
          )}
        </group>
        {children}
      </group>
    </group>
  );
}

/** The soft shadow under a thing standing on the ground, as the app draws it: a flat ink ellipse. */
export function Shadow({ x, z = 0, w, d = 0.5, opacity = 0.35 }: { x: number; z?: number; w: number; d?: number; opacity?: number }) {
  const palette = usePalette();
  return (
    <mesh position={[x, 0.01, z]} rotation-x={-Math.PI / 2} scale={[w, d, 1]}>
      <circleGeometry args={[1, 40]} />
      <meshBasicMaterial color={palette.night} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}
