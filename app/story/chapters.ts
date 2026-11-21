export interface Chapter {
  id: string;
  /** The giant caption. Keep it to three words or fewer. */
  caption: string;
  /** One short line under the caption, or nothing. */
  note?: string;
  /** Where the camera stands in the diorama for this chapter (world x). */
  station: number;
}

// The story follows the app's onboarding scenes (RIPDPI app/.../ui/screens/onboarding/scenes), laid out left to
// right as one landscape. Order matters: the scene reads chapters by index (see app/story/progress.ts).
export const CHAPTERS: readonly Chapter[] = [
  { id: "rip", caption: "R.I.P. DPI", note: "Network-path toolkit for Android", station: 0 },
  {
    id: "wall",
    caption: "Everything gets scanned.",
    note: "Deep packet inspection stops plain packets at the wall.",
    station: 18,
  },
  { id: "checkpoint", caption: "Names, sealed.", note: "Encrypted DNS: DoH, DoT, DNSCrypt, DoQ.", station: 36 },
  { id: "trouble", caption: "Find the break.", note: "Diagnostics show where the path fails.", station: 54 },
  { id: "connect", caption: "One tap.", note: "A local VPN or proxy. Your packets pass as ghosts.", station: 72 },
  { id: "night", caption: "Always on.", note: "Relays you control. Ours are invite-only.", station: 92 },
  { id: "get", caption: "Get RIPDPI", station: 92 },
];

export const REPO_URL = "https://github.com/po4yka/RIPDPI";
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
