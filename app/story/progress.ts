import { CHAPTERS } from "./chapters";

/**
 * Scroll position of the story, shared between the DOM (writer, via ScrollTrigger) and the scene (reader, in
 * useFrame). A plain mutable object, so scrolling never re-renders React.
 */
export const story = {
  /** 0 at the top of the story, 1 at its end. */
  progress: 0,
  /** Set by the scene when it renders on demand (reduced motion), so scrolling can request a frame. */
  invalidate: undefined as (() => void) | undefined,
};

export function setStoryProgress(value: number): void {
  story.progress = value;
  story.invalidate?.();
}

/** Story position in chapter units: chapter i runs from i to i + 1. */
export function chapterPosition(progress: number): number {
  return progress * CHAPTERS.length;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * How visible chapter `i`'s caption and note are at story position `c`, 0..1. The 3D caption and the page's note
 * share it, so they come and go together. The first caption gives way to the carving it names; the last one stays.
 */
export function chapterShown(i: number, c: number): number {
  const p = c - i;
  const enter = i === 0 ? 1 : smoothstep(-0.12, 0.1, p);
  const leave = i === CHAPTERS.length - 1 ? 0 : smoothstep(0.6, 0.76, p);
  return enter * (1 - leave);
}
