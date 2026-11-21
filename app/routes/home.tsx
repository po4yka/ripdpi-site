import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lazy, Suspense, useRef, useState } from "react";

import { useHydrated, useReducedMotion, useWebGL2 } from "~/lib/environment";
import { CHAPTERS, RELEASES_URL, REPO_URL, type Chapter } from "~/story/chapters";
import { Mark } from "~/story/Mark";
import { chapterPosition, chapterShown, setStoryProgress, smoothstep } from "~/story/progress";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js and R3F load only in the browser, after the prerendered page is on screen.
const StoryScene = lazy(() => import("~/scene/StoryScene"));

const SITE = "https://ripdpi.dev";
const TITLE = "RIPDPI: network-path toolkit for Android";
const DESCRIPTION =
  "RIPDPI finds out why a site does not open on your network, applies TCP, TLS and QUIC strategies on the device, and routes through relays you control.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { tagName: "link", rel: "canonical", href: `${SITE}/` },
    { property: "og:type", content: "website" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: `${SITE}/` },
  ];
}

/**
 * A chapter's words. Once the 3D scene is on screen the caption stands in the landscape, so the heading here is for
 * screen readers and search only; before that, and without WebGL, it is the caption on screen. The note is a
 * subtitle at the foot of the frame.
 */
function Caption({ chapter, first, inScene }: { chapter: Chapter; first: boolean; inScene: boolean }) {
  const Heading = first ? "h1" : "h2";
  return (
    <div className="mx-auto flex h-full w-full max-w-(--content-max) flex-col px-(--gutter) pt-[16vh] pb-[7vh]">
      <Heading
        {...(inScene ? {} : { "data-fade": "" })}
        className={
          inScene ? "sr-only" : "text-[clamp(3.25rem,11vw,10.5rem)] leading-[0.92] font-semibold tracking-[-0.045em] text-balance"
        }
      >
        {chapter.caption}
      </Heading>
      <div data-fade className="mt-auto flex flex-col items-start gap-6">
        {chapter.note && (
          <p className="max-w-[34ch] border-l border-current/35 pl-4 font-mono text-[clamp(0.9375rem,1.25vw,1.125rem)] leading-relaxed text-pretty">
            {chapter.note}
          </p>
        )}
        {chapter.id === "get" && (
          // Hidden, not only clear, until its chapter: links nobody can see must not take focus or clicks.
          <div data-interactive className="pointer-events-auto flex flex-col items-start gap-6">
            <a
              href={RELEASES_URL}
              className="group/cta flex items-center gap-5 bg-signal-night py-5 pr-7 pl-8 font-mono text-base font-medium tracking-wide text-night uppercase transition-[filter,scale] duration-(--duration-quick) ease-(--ease-standard) hover:brightness-110 active:scale-[0.96] sm:text-lg"
            >
              Download for Android
              <span aria-hidden="true" className="transition-transform duration-(--duration-quick) group-hover/cta:translate-y-0.5">
                ↓
              </span>
            </a>
            <p className="font-mono text-sm opacity-80">
              Android 8.1+ · AGPL-3.0 ·{" "}
              <a href={REPO_URL} className="underline decoration-current/40 underline-offset-4 hover:decoration-current">
                source code
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const webgl = useWebGL2();
  const reduced = useReducedMotion();
  const [sceneReady, setSceneReady] = useState(false);
  const inScene = webgl && sceneReady;
  const [markGone, setMarkGone] = useState(false);

  useGSAP(
    () => {
      const sections = gsap.utils.toArray<HTMLElement>("[data-chapter]");
      const rail = gsap.utils.toArray<HTMLElement>("[data-rail]");
      const cue = root.current?.querySelector<HTMLElement>("[data-cue]");
      let current = 0;
      // Every chapter's words fade by the same timing as its 3D caption, from the same story position.
      const apply = (progress: number) => {
        setStoryProgress(progress);
        const c = chapterPosition(progress);
        sections.forEach((section, i) => {
          const a = chapterShown(i, c);
          section.querySelectorAll<HTMLElement>("[data-fade]").forEach((el) => {
            el.style.opacity = String(a);
            el.style.transform = reduced ? "" : `translateY(${((1 - a) * (c < i ? 16 : -16)).toFixed(1)}px)`;
          });
          section.querySelectorAll<HTMLElement>("[data-interactive]").forEach((el) => {
            el.style.visibility = a > 0.5 ? "visible" : "hidden";
          });
        });
        // A chapter is the current one from the moment its words come in.
        current = Math.min(CHAPTERS.length - 1, Math.floor(c + 0.12));
        rail.forEach((a, i) => a.setAttribute("aria-current", String(i === current)));
        if (cue) cue.style.opacity = String(1 - smoothstep(0, 0.02, progress));
      };
      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => apply(self.progress),
      });
      apply(trigger.progress);

      // To a chapter: just past its start, where its words are in and its scene has all its play ahead.
      const go = (i: number) =>
        window.scrollTo({
          top: trigger.start + ((trigger.end - trigger.start) * (i ? i + 0.12 : 0)) / CHAPTERS.length,
          behavior: reduced ? "auto" : "smooth",
        });
      const onRail = (e: MouseEvent) => {
        e.preventDefault();
        go(rail.indexOf(e.currentTarget as HTMLElement));
      };
      // The arrow and page keys step by chapter: the story is too long to walk in key-sized scrolls.
      const onKey = (e: KeyboardEvent) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const step = e.key === "ArrowDown" || e.key === "PageDown" ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
        const to = current + step;
        if (!step || to < 0 || to >= CHAPTERS.length) return;
        e.preventDefault();
        go(to);
      };
      rail.forEach((a) => a.addEventListener("click", onRail));
      window.addEventListener("keydown", onKey);
      return () => {
        rail.forEach((a) => a.removeEventListener("click", onRail));
        window.removeEventListener("keydown", onKey);
      };
    },
    { scope: root, dependencies: [reduced, inScene], revertOnUpdate: true },
  );

  // The mark draws itself on while the scene loads, and the scroll cue nods.
  useGSAP(
    () => {
      if (reduced) return;
      gsap.to("[data-cue-arrow]", { y: 6, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap
        .timeline()
        .to("[data-mark] path", { strokeDashoffset: 0, duration: 1, ease: "power2.inOut", stagger: 0.12 })
        .to("[data-mark] path", { fillOpacity: 1, strokeOpacity: 0, duration: 0.5, ease: "power1.out" }, "-=0.35");
    },
    { scope: root, dependencies: [reduced] },
  );

  // Once the scene has a frame, the mark gives way to the tombstone it stands for.
  useGSAP(
    () => {
      if (!inScene) return;
      // It grows a little as it goes, toward the size of the stone behind it.
      gsap.to("[data-mark]", {
        opacity: 0,
        scale: reduced ? 1 : 1.2,
        duration: reduced ? 0 : 0.45,
        ease: "power1.out",
        onComplete: () => setMarkGone(true),
      });
    },
    { scope: root, dependencies: [inScene] },
  );

  return (
    <div ref={root} className="relative bg-night text-night-light">
      <header className="fixed inset-x-0 top-0 z-20 mx-auto flex max-w-(--content-max) items-center justify-between px-(--gutter) py-5 font-mono text-xs tracking-[0.14em] uppercase">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-5" />
          RIPDPI
        </a>
        {/* The one signal-coloured thing on the first screen, where the scene itself has no live path yet. */}
        <a
          href={RELEASES_URL}
          className="flex min-h-10 items-center bg-signal-night px-4 font-medium text-night transition-[filter,scale] duration-(--duration-quick) ease-(--ease-standard) hover:brightness-110 active:scale-[0.96]"
        >
          Download
        </a>
      </header>

      {/* The rail: one tick for each chapter, the current one in the signal colour. */}
      <nav aria-label="Chapters" className="fixed top-1/2 right-1 z-20 flex -translate-y-1/2 flex-col sm:right-4">
        {CHAPTERS.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            data-rail
            aria-label={chapter.caption}
            className="group flex h-7 w-9 items-center justify-end pr-2"
          >
            <span className="block h-0.5 w-3 bg-current opacity-45 transition-[width,opacity] duration-(--duration-quick) ease-(--ease-standard) group-hover:w-5 group-hover:opacity-100 group-aria-[current=true]:w-6 group-aria-[current=true]:bg-signal-night group-aria-[current=true]:opacity-100" />
          </a>
        ))}
      </nav>

      {/* Shown on the first screen only, and only where the page can take it away again. */}
      {hydrated && (
        <div
          data-cue
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 font-mono text-xs tracking-[0.14em] uppercase"
        >
          Scroll
          <span data-cue-arrow>↓</span>
        </div>
      )}

      {/* Scene layer: stays on screen for the whole story. Without WebGL it shows the app icon. */}
      <div className="sticky top-0 h-dvh overflow-hidden" aria-hidden="true">
        {webgl && (
          <Suspense fallback={null}>
            <StoryScene animate={!reduced} onReady={() => setSceneReady(true)} />
          </Suspense>
        )}
        {/* The mark stays over the canvas until the scene has drawn a frame, then fades into it. */}
        {!markGone && <Mark />}
        {/* The foot of the frame goes back into the night, so the notes read over the grass. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32vh] bg-linear-to-t from-night/80 to-transparent" />
      </div>

      {/* The sections give the story its scroll length. In the browser their words sit in one fixed frame and
          cross-fade by story position; without JavaScript each section shows its own words as it passes. */}
      <main className="pointer-events-none relative -mt-[100dvh]">
        {CHAPTERS.map((chapter, i) => (
          <section key={chapter.id} id={chapter.id} data-chapter className="h-[170vh]">
            <div className={hydrated ? "pointer-events-none fixed inset-0" : "sticky top-0 h-dvh"}>
              <Caption chapter={chapter} first={i === 0} inScene={inScene} />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
