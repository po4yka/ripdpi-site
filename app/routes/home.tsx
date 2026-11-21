import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lazy, Suspense, useRef, useState } from "react";

import { useHydrated, useReducedMotion, useWebGL2 } from "~/lib/environment";
import { CHAPTERS, RELEASES_URL, REPO_URL, type Chapter } from "~/story/chapters";
import { chapterPosition, chapterShown, setStoryProgress } from "~/story/progress";

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

  useGSAP(
    () => {
      const sections = gsap.utils.toArray<HTMLElement>("[data-chapter]");
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
      };
      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => apply(self.progress),
      });
      apply(trigger.progress);
    },
    { scope: root, dependencies: [reduced, inScene], revertOnUpdate: true },
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

      {/* Scene layer: stays on screen for the whole story. Without WebGL it shows the app icon. */}
      <div className="sticky top-0 h-dvh overflow-hidden" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={<div className="story-fallback h-full" />}>
            <StoryScene animate={!reduced} onReady={() => setSceneReady(true)} />
          </Suspense>
        ) : (
          <div className="story-fallback h-full" />
        )}
        {/* The foot of the frame goes back into the night, so the notes read over the grass. */}
        <div className="absolute inset-x-0 bottom-0 h-[32vh] bg-linear-to-t from-night/80 to-transparent" />
      </div>

      {/* The sections give the story its scroll length. In the browser their words sit in one fixed frame and
          cross-fade by story position; without JavaScript each section shows its own words as it passes. */}
      <main className="pointer-events-none relative -mt-[100dvh]">
        {CHAPTERS.map((chapter, i) => (
          <section key={chapter.id} data-chapter className="h-[170vh]">
            <div className={hydrated ? "pointer-events-none fixed inset-0" : "sticky top-0 h-dvh"}>
              <Caption chapter={chapter} first={i === 0} inScene={inScene} />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
