import type { RootState } from "@react-three/fiber";
import { createContext, useContext } from "react";
import * as THREE from "three";

import { resolveCssColor } from "~/lib/environment";
import { smoothstep } from "~/story/progress";

/**
 * The scene colours, as roles of the app's night scene (SceneColors in ScenePen.kt). The whole story plays at night:
 * the night and its light tone make every surface, and the signal and the danger colours are the only hues, carried
 * by light sources.
 */
export interface Palette {
  /** Silhouettes: posts, gantry, phone, crow, trees. */
  ink: THREE.Color;
  /** Light surfaces: bricks, packets, the globe, the board text. */
  paper: THREE.Color;
  mid: THREE.Color;
  ground: THREE.Color;
  sky: THREE.Color;
  horizon: THREE.Color;
  sheet: THREE.Color;
  eye: THREE.Color;
  stone: THREE.Color;
  carve: THREE.Color;
  night: THREE.Color;
  nightLight: THREE.Color;
  signal: THREE.Color;
  danger: THREE.Color;
  /** Above 1, so only these pass the bloom threshold: the signal and the danger glow, nothing else. */
  signalGlow: THREE.Color;
  dangerGlow: THREE.Color;
}

const css = (v: string) => new THREE.Color(resolveCssColor(v));

/** Brightens a colour until its strongest channel reaches `peak`, so it passes the bloom threshold but keeps its hue. */
function glow(color: THREE.Color, peak = 1.6): THREE.Color {
  const max = Math.max(color.r, color.g, color.b, 1e-3);
  return color.clone().multiplyScalar(peak / max);
}

export function makePalette(): Palette {
  const night = css("--night");
  const nightLight = css("--night-light");
  const tone = (share: number) => night.clone().lerp(nightLight, share);
  // The app's dark signal and error roles: the light shines in the night whatever the page theme.
  const signal = css("--signal-night");
  const danger = css("--danger-night");
  return {
    ink: tone(0.06),
    paper: tone(0.82),
    mid: css("--muted-foreground"),
    ground: tone(0.1),
    sky: night.clone(),
    // The shares mix in linear light, so a small share is already a clear step: the horizon is a dim glow under a
    // dark sky, not a grey band. The fog takes the same tone.
    horizon: tone(0.03),
    sheet: nightLight.clone(),
    eye: night.clone(),
    stone: tone(0.42),
    carve: tone(0.12),
    night,
    nightLight,
    signal,
    danger,
    signalGlow: glow(signal),
    dangerGlow: glow(danger),
  };
}

/**
 * A grey value-noise canvas, tileable: the grain of stone and soil. Used as a colour map (around white, so it only
 * varies the material colour) and as a bump map.
 */
export function noiseTexture(size = 256, cells = 24, seed = 1, contrast = 0.35): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(size, size);
  const octaves = [cells, cells * 2, cells * 4, cells * 8];
  const lattice = (o: number, i: number, j: number) => hash(seed * 977 + o * 131 + (i % octaves[o]!) * 57.3 + (j % octaves[o]!) * 311.7);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 0.5;
      octaves.forEach((n, o) => {
        const fx = (x / size) * n;
        const fy = (y / size) * n;
        const i = Math.floor(fx);
        const j = Math.floor(fy);
        const u = smoothstep(0, 1, fx - i);
        const w = smoothstep(0, 1, fy - j);
        const a = lattice(o, i, j) + (lattice(o, i + 1, j) - lattice(o, i, j)) * u;
        const b = lattice(o, i, j + 1) + (lattice(o, i + 1, j + 1) - lattice(o, i, j + 1)) * u;
        v += (a + (b - a) * w) * amp;
        amp /= 2;
      });
      const c = Math.round(255 * (1 - contrast + contrast * v * 1.07));
      const k = (y * size + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = c;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const PaletteContext = createContext<Palette | null>(null);

export function usePalette(): Palette {
  const palette = useContext(PaletteContext);
  if (!palette) throw new Error("usePalette outside the story scene");
  return palette;
}

/** The smoothed story position in chapter units, shared by every station. */
export const ChapterContext = createContext<{ current: number }>({ current: 0 });
export const useChapter = () => useContext(ChapterContext);

/** Elapsed scene time that stops under reduced motion, so idle motion (bob, blink, hem) freezes. */
export const ClockContext = createContext<{ current: number }>({ current: 0 });
export const useSceneTime = () => useContext(ClockContext);

export { smoothstep } from "~/story/progress";

/** Progress through `chapter`, from 0 when it starts to 1 when it ends. */
export function local(c: number, chapter: number): number {
  return Math.min(1, Math.max(0, c - chapter));
}

/** Deterministic randomness, so the diorama is the same on every load. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The reader's pointer, for the props that answer it. `idle` counts the seconds since it last moved: a pointer at
 * rest, or a touch screen nobody touched, must not hold a prop's attention. Under reduced motion it never moves.
 */
export const pointer = { idle: Infinity };

const projected = new THREE.Vector3();

/** From a place in the world to the pointer, on screen: y up, the screen 2 high, x in the same unit. */
export function toPointer(state: RootState, world: THREE.Vector3, out: THREE.Vector2): THREE.Vector2 {
  projected.copy(world).project(state.camera);
  return out.set(((state.pointer.x - projected.x) * state.size.width) / state.size.height, state.pointer.y - projected.y);
}
