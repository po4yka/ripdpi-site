import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { PerformanceMonitor } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { CHAPTERS } from "~/story/chapters";
import { chapterPosition, story } from "~/story/progress";
import { Captions } from "./Captions";
import { Bursts } from "./Effects";
import {
  arc,
  ChapterContext,
  ClockContext,
  makePalette,
  PaletteContext,
  pointer,
  smoothstep,
  useChapter,
  usePalette,
  useSceneTime,
} from "./kit";
import { Cable, Dust, Fence, Grove, Grass, Ground, Hills, Mist, MOON_DIR, Sky } from "./Scenery";
import { backOff, shotAt } from "./shots";
import {
  BarrierStation,
  CheckpointStation,
  ConnectStation,
  NightStation,
  RelayStation,
  RipStation,
  TroubleStation,
  WallStation,
} from "./Stations";

/** The scene time of the still picture under reduced motion. */
const STILL = 2.9;

const lerpShot = (c: number, aspect: number) => {
  const i = Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(c)));
  const a = shotAt(i, aspect);
  const b = shotAt(i + 1, aspect);
  const p = c - i;
  // Hold on the station for most of the chapter, with a slow push in; then travel to the next one.
  // The last chapter has nowhere to go: it keeps its push in to the end of the page.
  const t = i === CHAPTERS.length - 1 ? 0 : smoothstep(0.6, 1, p);
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
  const fill = useRef<THREE.DirectionalLight>(null!);
  const look = useMemo(() => new THREE.Vector3(), []);
  const lastPointer = useMemo(() => new THREE.Vector2(), []);
  const started = useRef(false);

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
    if (animate) pointer.idle = lastPointer.equals(state.pointer) ? pointer.idle + delta : 0;
    lastPointer.copy(state.pointer);
    const target = chapterPosition(story.progress);
    chapter.current = animate ? THREE.MathUtils.damp(chapter.current, target, 4, delta) : target;

    // The censor's red holds from the wall to the break; the tap puts the signal in its place.
    const c = chapter.current;
    arc.danger = smoothstep(0.6, 1.1, c) * (1 - smoothstep(3.7, 4.16, c));
    arc.signal = smoothstep(4.16, 4.5, c);
    const hue = arc.signal > 0 ? palette.signal : palette.danger;
    const share = Math.max(arc.danger, arc.signal);
    arc.tint.copy(palette.nightLight).lerp(hue, 0.5 * share);
    arc.horizon.copy(palette.horizon).lerp(hue, 0.07 * share);
    fill.current.color.copy(arc.tint);

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
    // The first frame does the same, so a page that opens in mid-story or on a tall screen does not fly in from
    // the grave.
    const settle = animate && started.current;
    started.current = true;
    const ease = (from: number, to: number) => (settle ? THREE.MathUtils.damp(from, to, 3, delta) : to);
    cam.position.x = ease(cam.position.x, shot.x + px + sway);
    cam.position.y = ease(cam.position.y, shot.y + py + (far - 1) * 1.6);
    cam.position.z = ease(cam.position.z, shot.z * far);
    look.set(shot.lookX - px * 0.4, shot.lookY + (far - 1) * 0.8, 0);
    cam.lookAt(look);

    const fog = scene.fog as THREE.Fog | null;
    if (fog) fog.near = cam.position.z + 4;
    if (fog) fog.far = cam.position.z + 60;
    if (fog) fog.color.copy(arc.horizon);

    // The moonlight comes from the moon of the sky dome, and its shadow box stands over the shot.
    // It follows the shot, not the pointer: a shadow map that slides with every move of the mouse makes its edges crawl.
    moon.current.target.position.set(shot.lookX, 0, 0);
    moon.current.position.copy(moon.current.target.position).addScaledVector(MOON_DIR, 40);
    moon.current.target.updateMatrixWorld();
    // The focus stands between the props and the captions behind them, so both stay sharp and only the far sky softens.
    focus.current?.target?.set(look.x, look.y - 1.5, -3);
  });

  return (
    <>
      <hemisphereLight args={[palette.nightLight, palette.night, 0.3]} />
      {/* A faint cold fill from the viewer's side, so the faces turned from the moon do not drown. */}
      <directionalLight ref={fill} position={[-6, 5, 20]} color={palette.nightLight} intensity={0.35} />
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
    const walk = (o: THREE.Object3D, off: boolean, flat: boolean) => {
      const no = off || !!o.userData.noShadow;
      const noCast = flat || !!o.userData.noCast;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !("isLineSegments2" in mesh)) {
        const m = mesh.material as THREE.Material;
        mesh.castShadow = !no && !noCast && !m.transparent;
        mesh.receiveShadow = !no && m instanceof THREE.MeshStandardMaterial;
      }
      o.children.forEach((c) => walk(c, no, noCast));
    };
    walk(scene, false, false);
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
  // Under reduced motion the time stands still, so it stands at a moment that tells the story: a packet stopped
  // at the wall, ghosts on both sides of it, every eye open.
  const clock = useRef(animate ? 0 : STILL);
  useEffect(() => {
    if (!animate) clock.current = STILL;
  }, [animate]);
  const focus = useRef<DepthOfFieldEffect | null>(null);
  const [level, setLevel] = useState(startLevel);
  const quality = QUALITY[level]!;
  // Under the story the scene scrolls away, and a scene nobody sees must not keep the GPU busy.
  const canvas = useRef<HTMLCanvasElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const seen = new IntersectionObserver(([e]) => setOnScreen(e!.isIntersecting));
    seen.observe(canvas.current!);
    return () => seen.disconnect();
  }, []);

  return (
    <Canvas
      ref={canvas}
      flat
      shadows="percentage"
      camera={{ position: [1.6, 1.5, 12.5], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, quality.dpr]}
      frameloop={!onScreen ? "never" : animate ? "always" : "demand"}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.horizon, 20, 70]} />
      <PaletteContext.Provider value={palette}>
        <ChapterContext.Provider value={chapter}>
          <ClockContext.Provider value={clock}>
            {/* Drawing on demand has no frame rate to judge, so only the running scene is watched. It goes away while
                the scene is off screen: the gap would count as one slow sample. */}
            {animate ? (
              onScreen && <PerformanceMonitor onDecline={() => setLevel((l) => Math.min(QUALITY.length - 1, l + 1))} />
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
            <Grove />
            <Hills />
            <Dust />
            <Mist />
            <Cable />
            <Bursts />
            <Captions />
            <RipStation />
            <WallStation />
            <CheckpointStation />
            <TroubleStation />
            <ConnectStation />
            <BarrierStation />
            <RelayStation />
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
