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
  { id: "rip", caption: "R.I.P. DPI", note: "Find why a site fails on your network. Fix it on the phone.", station: 0 },
  {
    id: "wall",
    caption: "Every packet, scanned.",
    note: "Deep packet inspection stops plain packets at the wall.",
    station: 18,
  },
  { id: "checkpoint", caption: "Names, sealed.", note: "Encrypted DNS. The checkpoint cannot read where you go.", station: 36 },
  { id: "trouble", caption: "Find the break.", note: "Diagnostics show where the path fails.", station: 54 },
  { id: "connect", caption: "One tap.", note: "A local VPN or proxy. Your packets pass as ghosts.", station: 72 },
  { id: "barrier", caption: "Straight through.", note: "Packet strategies, applied on the device.", station: 90 },
  { id: "relay", caption: "Bring your relay.", note: "Relays you control. Ours are invite-only.", station: 108 },
  { id: "night", caption: "Always on.", note: "Remembers each network. Follows every handover.", station: 134 },
  { id: "get", caption: "Get RIPDPI", station: 134 },
];

export const REPO_URL = "https://github.com/po4yka/RIPDPI";
export const RELEASES_URL = `${REPO_URL}/releases/latest`;

export const SITE = "https://ripdpi.dev";
export const TITLE = "RIPDPI: network-path toolkit for Android";
export const DESCRIPTION =
  "RIPDPI finds out why a site does not open on your network, applies TCP, TLS and QUIC strategies on the device, and routes through relays you control.";
