import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { PerformanceMonitor } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { CHAPTERS } from "~/story/chapters";
import { chapterPosition, story } from "~/story/progress";
import { Captions } from "./Captions";
import { ChapterContext, ClockContext, makePalette, PaletteContext, smoothstep, useChapter, usePalette, useSceneTime } from "./kit";
import { Fence, Grass, Ground, Mist, MOON_DIR, Sky } from "./Scenery";
import { backOff, shotAt } from "./shots";
import { CheckpointStation, ConnectStation, NightStation, RipStation, TroubleStation, WallStation } from "./Stations";

const lerpShot = (c: number, aspect: number) => {
  const i = Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(c)));
  const a = shotAt(i, aspect);
  const b = shotAt(i + 1, aspect);
  const p = c - i;
  // Hold on the station for most of the chapter, with a slow push in; then travel to the next one.
  const t = smoothstep(0.6, 1, p);
  const push = 1 - 0.1 * smoothstep(0, 0.6, p) * (1 - t);
  const mix = (k: "x" | "y" | "z" | "lookX" | "lookY") => a[k] + (b[k] - a[k]) * t;
  return { x: mix("x"), y: mix("y"), z: mix("z") * push, lookX: mix("lookX"), lookY: mix("lookY") };
};

/**
 * What the renderer spends, from the full picture down. The scene steps down one level each time the frame rate
 * stays low, and never back up, so the picture does not flicker between levels.
 */
const QUALITY = [
  { dpr: 1.75, samples: 4, depthOfField: true, shadowMap: 2048 },
  { dpr: 1.5, samples: 2, depthOfField: false, shadowMap: 2048 },
  { dpr: 1.25, samples: 0, depthOfField: false, shadowMap: 1024 },
] as const;

/** A touch device starts one level down: its first seconds must not stutter while the monitor makes up its mind. */
const startLevel = () => (window.matchMedia("(pointer: coarse)").matches ? 1 : 0);

function Director({
  animate,
  focus,
  shadowMap,
}: {
  animate: boolean;
  focus: { current: DepthOfFieldEffect | null };
  shadowMap: number;
}) {
  const palette = usePalette();
  const chapter = useChapter();
  const clock = useSceneTime();
  const scene = useThree((s) => s.scene);
  const moon = useRef<THREE.DirectionalLight>(null!);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    scene.add(moon.current.target);
  }, [scene]);

  // three.js keeps the shadow map it first made, so a new size needs the old map gone.
  useEffect(() => {
    const shadow = moon.current.shadow;
    shadow.mapSize.set(shadowMap, shadowMap);
    shadow.map?.dispose();
    shadow.map = null;
  }, [shadowMap]);

  useFrame((state, delta) => {
    if (animate) clock.current += delta;
    const target = chapterPosition(story.progress);
    chapter.current = animate ? THREE.MathUtils.damp(chapter.current, target, 4, delta) : target;

    const aspect = state.size.width / state.size.height;
    const shot = lerpShot(chapter.current, aspect);
    const cam = state.camera;
    const px = animate ? state.pointer.x * 0.5 : 0;
    const py = animate ? state.pointer.y * 0.25 : 0;
    const far = backOff(aspect);
    // A slow breath of the camera keeps the frame alive while the reader stops scrolling.
    const sway = animate ? Math.sin(clock.current * 0.25) * 0.15 : 0;
    // Under reduced motion a frame is drawn only on scroll, so the camera goes straight to its place instead of
    // easing there over frames that never come.
    const ease = (from: number, to: number) => (animate ? THREE.MathUtils.damp(from, to, 3, delta) : to);
    cam.position.x = ease(cam.position.x, shot.x + px + sway);
    cam.position.y = ease(cam.position.y, shot.y + py + (far - 1) * 1.6);
    cam.position.z = ease(cam.position.z, shot.z * far);
    look.set(shot.lookX - px * 0.4, shot.lookY + (far - 1) * 0.8, 0);
    cam.lookAt(look);

    const fog = scene.fog as THREE.Fog | null;
    if (fog) fog.near = cam.position.z + 4;
    if (fog) fog.far = cam.position.z + 60;

    // The moonlight comes from the moon of the sky dome, and its shadow box follows the camera.
    moon.current.position.copy(look).setY(0).addScaledVector(MOON_DIR, 40);
    moon.current.target.position.copy(look).setY(0);
    moon.current.target.updateMatrixWorld();
    // The focus stands between the props and the captions behind them, so both stay sharp and only the far sky softens.
    focus.current?.target?.set(look.x, look.y - 1.5, -3);
  });

  return (
    <>
      <hemisphereLight args={[palette.nightLight, palette.night, 0.3]} />
      {/* A faint cold fill from the viewer's side, so the faces turned from the moon do not drown. */}
      <directionalLight position={[-6, 5, 20]} color={palette.nightLight} intensity={0.35} />
      <directionalLight
        ref={moon}
        color={palette.nightLight}
        intensity={2.6}
        castShadow
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
    </>
  );
}

/**
 * Meshes cast and take the moon's shadows unless they or a parent opt out (`userData.noShadow`), they only take
 * them (`userData.noCast`), or they are see-through. Text and lines arrive late, so this runs now and then.
 */
function ShadowRig() {
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current++ % 30 !== 0) return;
    const walk = (o: THREE.Object3D, off: boolean) => {
      const no = off || !!o.userData.noShadow;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !("isLineSegments2" in mesh)) {
        const m = mesh.material as THREE.Material;
        mesh.castShadow = !no && !o.userData.noCast && !m.transparent;
        mesh.receiveShadow = !no && m instanceof THREE.MeshStandardMaterial;
      }
      o.children.forEach((c) => walk(c, no));
    };
    walk(scene, false);
  });
  return null;
}

/** Tells the page once the first frame is on screen, so the page keeps its own heading until then. */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // After this frame is drawn, not during it.
    requestAnimationFrame(onReady);
  });
  return null;
}

function DemandBridge() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    story.invalidate = invalidate;
    return () => {
      story.invalidate = undefined;
    };
  }, [invalidate]);
  return null;
}

export default function StoryScene({ animate, onReady }: { animate: boolean; onReady: () => void }) {
  const palette = useMemo(() => makePalette(), []);
  const chapter = useRef(chapterPosition(story.progress));
  const clock = useRef(0);
  const focus = useRef<DepthOfFieldEffect | null>(null);
  const [level, setLevel] = useState(startLevel);
  const quality = QUALITY[level]!;

  return (
    <Canvas
      flat
      shadows="percentage"
      camera={{ position: [1.6, 1.5, 12.5], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, quality.dpr]}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.horizon, 20, 70]} />
      <PaletteContext.Provider value={palette}>
        <ChapterContext.Provider value={chapter}>
          <ClockContext.Provider value={clock}>
            {/* Drawing on demand has no frame rate to judge, so only the running scene is watched. */}
            {animate ? (
              <PerformanceMonitor onDecline={() => setLevel((l) => Math.min(QUALITY.length - 1, l + 1))} />
            ) : (
              <DemandBridge />
            )}
            <FirstFrame onReady={onReady} />
            <Director animate={animate} focus={focus} shadowMap={quality.shadowMap} />
            <ShadowRig />
            <Sky />
            <Ground />
            <Grass />
            <Fence />
            <Mist />
            <Captions />
            <RipStation />
            <WallStation />
            <CheckpointStation />
            <TroubleStation />
            <ConnectStation />
            <NightStation />
            {/* Only the boosted signal and danger colours exceed 1 before tone mapping, so only they bloom. */}
            <EffectComposer multisampling={quality.samples}>
              {quality.depthOfField ? (
                <DepthOfField ref={focus} target={[0, 0, 0]} worldFocusRange={26} bokehScale={1.6} />
              ) : (
                <></>
              )}
              <Bloom intensity={1.3} luminanceThreshold={1} luminanceSmoothing={0.25} mipmapBlur />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette offset={0.28} darkness={0.55} />
              <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.06} />
            </EffectComposer>
          </ClockContext.Provider>
        </ChapterContext.Provider>
      </PaletteContext.Provider>
    </Canvas>
  );
}
