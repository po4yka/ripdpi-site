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
  /** The widest the caption may run, as a share of the frame width, so it wraps before it reaches the props. */
  captionWidth?: number;
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

/**
 * What a landscape screen changes: there the caption stands beside the props, not above them, so each shot keeps the
 * sky at the caption's place clear of the fixed props (the stone, the wall, the gantry's board).
 */
const WIDE: Record<string, Partial<Shot>> = {
  rip: { caption: 0.4 },
  wall: { captionWidth: 0.38 },
  checkpoint: { x: -2, lookX: -2.6, captionWidth: 0.36 },
  // The download button stands at the foot of the frame on the left: the stone and the ghost keep to the right of it.
  get: { x: -3.5, lookX: -3.5, z: 22.5 },
};

/**
 * What a portrait screen changes: it sees a narrow slice, so each shot turns to the one prop that tells the chapter
 * and lets the rest of the station run out of frame.
 */
const TALL: Record<string, Partial<Shot>> = {
  // The caption comes down from the moon's place to stand just over the board.
  checkpoint: { x: -0.1, lookX: -0.7, caption: 0.3 },
  trouble: { x: -2, lookX: -1 },
  // The phone, the arc and the wall: the tap and what it opens.
  connect: { x: -2, lookX: -1.5 },
  night: { x: 0.5, lookX: 1.5, z: 17 },
  get: { x: 1.2, lookX: 1.2 },
};

/** The shot of chapter `i` on a screen of this aspect, in world coordinates. */
export function shotAt(i: number, aspect: number): Shot {
  const c = CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, i))]!;
  const s = { ...SHOTS[c.id]!, ...(aspect > 1 ? WIDE : TALL)[c.id] };
  return { ...s, x: c.station + s.x, lookX: c.station + s.lookX };
}

/**
 * Portrait screens see less width, so the camera backs off, but not so far that the props shrink to the middle of a
 * tall frame: past the limit the shot crops the station instead (see `TALL`).
 */
export function backOff(aspect: number): number {
  return Math.min(1.7, Math.max(1, 1.5 / aspect));
}
