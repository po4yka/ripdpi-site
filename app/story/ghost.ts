/**
 * The sheet of the app icon's ghost, from SceneGhost.kt (sheetShape), in its 300x170 design units: x to the right,
 * y down, the line of the hem at y = -3. One outline for the 3D ghost and for the line drawings, so the two agree.
 * Each step is a path command and its points: M moves, Q is a quadratic curve, C a cubic one.
 */
export type SheetStep = ["M" | "Q" | "C", ...number[]];

export const SHEET_HALF_WIDTH = 12.8;
export const SHEET_HEM = -3;

export const SHEET: readonly SheetStep[] = [
  ["M", -9.6, -22],
  ["Q", -9.9, -30.6, -5.2, -30.6],
  ["Q", -1.1, -30.6, -1.5, -24.6],
  ["Q", 0, -22.4, 1.5, -24.6],
  ["Q", 1.1, -30.6, 5.2, -30.6],
  ["Q", 9.9, -30.6, 9.6, -22],
  ["C", 10.5, -14, SHEET_HALF_WIDTH, -9, SHEET_HALF_WIDTH, SHEET_HEM],
  // The hem: six scallops, alternately low and high, as in the app.
  ...Array.from({ length: 6 }, (_, i): SheetStep => {
    const k = i + 1;
    const step = (2 * SHEET_HALF_WIDTH) / 6;
    return ["Q", SHEET_HALF_WIDTH - (k - 0.5) * step, SHEET_HEM + (k % 2 === 1 ? 2.8 : -1.4), SHEET_HALF_WIDTH - k * step, SHEET_HEM];
  }),
  ["C", -SHEET_HALF_WIDTH, -9, -10.5, -14, -9.6, -22],
];
