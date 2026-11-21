import { useSyncExternalStore } from "react";

const noop = () => () => {};

let webgl2: boolean | undefined;
function supportsWebGL2(): boolean {
  if (webgl2 === undefined) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      webgl2 = !!gl;
      // Release the probe at once: browsers cap live WebGL contexts, and the scene needs one.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}

/** False during prerender and on devices without WebGL2, so the static fallback renders instead. */
export function useWebGL2(): boolean {
  return useSyncExternalStore(noop, supportsWebGL2, () => false);
}

/** False in the prerendered HTML (and so without JavaScript), true once the page runs in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mql = window.matchMedia(REDUCED);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True during prerender: the safe default is no motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => true);
}

/** Resolves a CSS colour variable (including light-dark()) to an rgb() string for the current scheme. */
export function resolveCssColor(variable: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  probe.style.display = "none";
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}
