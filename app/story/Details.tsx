import { RELEASES_URL, REPO_URL } from "./chapters";
import { EXTRAS, FAQ, FEATURES, STEPS } from "./content";

const SECTION = "mx-auto w-full max-w-(--content-max) border-t border-current/15 px-(--gutter) py-[clamp(4rem,10vw,8rem)]";
const TITLE = "text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance";
const SUBTITLE = "text-xl leading-tight font-semibold tracking-[-0.02em]";
const BODY = "mt-3 max-w-[46ch] font-mono text-[0.9375rem] leading-relaxed text-pretty opacity-80";

/** The plain page under the story: what the app does, how, the common questions, and the download once more. */
export function Details() {
  return (
    <div data-details className="relative bg-night text-night-light">
      <section aria-labelledby="features-title" className={SECTION}>
        <h2 id="features-title" className={TITLE}>
          What it does
        </h2>
        <ul className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.id}>
              {/* The app's own screen, in its light theme: a lit window in the night. */}
              <img
                src={f.image}
                alt={f.alt}
                width={600}
                height={1000}
                loading="lazy"
                decoding="async"
                className="w-full max-w-88 rounded-control outline outline-1 -outline-offset-1 outline-black/10"
              />
              <h3 className={`mt-6 ${SUBTITLE}`}>{f.title}</h3>
              <p className={BODY}>{f.text}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-16 grid gap-8 md:grid-cols-3">
          {EXTRAS.map((e) => (
            <li key={e.title} className="border-l border-current/35 pl-4">
              <h3 className="font-mono text-sm font-medium tracking-[0.08em] uppercase">{e.title}</h3>
              <p className={BODY}>{e.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-title" className={SECTION}>
        <h2 id="how-title" className={TITLE}>
          How it works
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="font-mono text-sm text-signal-night tabular-nums">0{i + 1}</span>
              <h3 className={`mt-3 ${SUBTITLE}`}>{s.title}</h3>
              <p className={BODY}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-title" className={SECTION}>
        <h2 id="faq-title" className={TITLE}>
          Questions
        </h2>
        <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className={SUBTITLE}>{item.q}</dt>
              <dd className={`${BODY} ml-0`}>{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="get-title" className={`${SECTION} flex flex-col items-start gap-8`}>
        <h2 id="get-title" className={TITLE}>
          Get RIPDPI
        </h2>
        <a
          href={RELEASES_URL}
          className="group/cta flex items-center gap-5 bg-signal-night py-5 pr-7 pl-8 font-mono text-base font-medium tracking-wide text-night uppercase transition-[filter,scale] duration-(--duration-quick) ease-(--ease-standard) hover:brightness-110 active:scale-[0.96] sm:text-lg"
        >
          Download for Android
          <span aria-hidden="true" className="transition-transform duration-(--duration-quick) group-hover/cta:translate-y-0.5">
            ↓
          </span>
        </a>
      </section>

      <footer className="mx-auto flex w-full max-w-(--content-max) flex-wrap gap-x-8 gap-y-3 border-t border-current/15 px-(--gutter) py-8 font-mono text-sm">
        <span className="opacity-70">RIPDPI · Android 8.1+ · AGPL-3.0</span>
        <a href={REPO_URL} className="underline decoration-current/40 underline-offset-4 hover:decoration-current">
          Source code
        </a>
        <a href={RELEASES_URL} className="underline decoration-current/40 underline-offset-4 hover:decoration-current">
          Releases
        </a>
      </footer>
    </div>
  );
}
