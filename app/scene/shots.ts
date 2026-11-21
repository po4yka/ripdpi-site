import { CHAPTERS } from "~/story/chapters";

/**
 * Where the camera stands for each chapter, relative to the chapter's station: low, close, looking up a little, so
 * the props stand against the lighter sky at the horizon. `z` is the distance on a landscape screen; portrait
 * screens back off from it.
 */
export interface Shot {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  /** Height of the caption above the look point, as a share of the frame height. */
  caption?: number;
}

const SHOTS: Record<string, Shot> = {
  rip: { x: 1.6, y: 1.5, z: 12.5, lookX: 1.4, lookY: 4.3 },
  wall: { x: -0.5, y: 1.8, z: 15, lookX: 0.5, lookY: 4.4 },
  checkpoint: { x: 1, y: 1.6, z: 13.5, lookX: 0.4, lookY: 3.6, caption: 0.4 },
  trouble: { x: -1, y: 1.6, z: 14.5, lookX: 0, lookY: 3.6 },
  connect: { x: 0.5, y: 1.8, z: 15, lookX: 1, lookY: 4.4 },
  night: { x: -0.5, y: 1.5, z: 13, lookX: 0.5, lookY: 3.8 },
  get: { x: 2.5, y: 3.2, z: 19, lookX: 2.5, lookY: 6.2 },
};

/** The shot of chapter `i`, in world coordinates. */
export function shotAt(i: number): Shot {
  const c = CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, i))]!;
  const s = SHOTS[c.id]!;
  return { ...s, x: c.station + s.x, lookX: c.station + s.lookX };
}

/** Portrait screens see less width, so the camera backs off to keep each station in frame. */
export function backOff(aspect: number): number {
  return Math.min(2.3, Math.max(1, 1.5 / aspect));
}
