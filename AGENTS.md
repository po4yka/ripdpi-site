# ripdpi-site

Landing page for the RIPDPI Android app and its invite-only relay service, served at https://ripdpi.dev.

## Stack

- React 19 and React Router 8 in framework mode with `ssr: false` and `prerender: ["/"]` (`react-router.config.ts`): the page is HTML at build time, then hydrates into the full interactive app. There is no runtime server.
- 3D: three.js with React Three Fiber, drei and postprocessing, under `app/scene/`. Scene modules load only through `React.lazy` after hydration; never import them from a module that the prerender evaluates.
- Motion: GSAP (ScrollTrigger and the other plugins) through `@gsap/react`'s `useGSAP`. Do not add a second animation library.
- Tailwind 4 through `@tailwindcss/vite`; tokens are exposed as utilities in `app/app.css`.
- Build output is `build/client/`, deployed as a Cloudflare Worker with static assets only (no worker script, no bindings).
- English only for now, at `/` (`app/routes/home.tsx`). Story captions live in `app/story/chapters.ts`.

## Commands

- `npm run dev`: local server.
- `npm run check`: typegen, `tsc`, ESLint, and production build. Run it before every commit.
- TypeScript stays on 6.0 until typescript-eslint supports 7.
- CI (`.github/workflows/ci.yml`) runs commitlint on PR commits, `npm run check`, `npm audit` and a Wrangler dry run. A push to `main` deploys `build/client/` with `wrangler deploy` (config in `wrangler.jsonc`); the `production` environment needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Lint workflow changes with `actionlint` and `zizmor`.

## Skills

Vendored skills in `.claude/skills/` (sources and commits in `.claude/skills/SOURCES.md`). Use `threejs-*` for any scene work, `gsap-*` for animation, `make-interfaces-feel-better` for UI detail, and `geo-*` before launch.

## Design rules

- Tokens in `app/styles/tokens.css` come from the RIPDPI app's Kotlin theme (`app/src/main/kotlin/com/poyka/ripdpi/ui/theme`). Change them only to follow the app. Do not copy from the app's `docs/design/rds/colors_and_type.css`: it has drifted from Kotlin.
- The story retells the app's onboarding scenes (RIPDPI `app/.../ui/screens/onboarding/scenes/`) as one 3D landscape: the ghost of the app icon, the R.I.P. DPI tombstone, the wall with its scanner, the checkpoint, the posts with lamps, the tunnel, the night. Read the matching Kotlin scene before changing a station.
- The whole story plays at night, lit like a film set: moonlight with shadows from the sky dome's moon, a dim fill, and coloured light only from the cyan signal (live connection) and the danger red (scanner, failures). Surfaces take the night tones of the app's `SceneColors` (`ScenePen.kt`). Do not add other hues. The site uses the dark theme only (`color-scheme: dark`).
- Captions stand in the 3D landscape behind the props (`app/scene/Captions.tsx`), framed by the per-chapter shots in `app/scene/shots.ts`. The HTML headings stay for screen readers, search and the no-WebGL page.
- Every animation must stop under `prefers-reduced-motion: reduce`, and the page must work with no WebGL and no JavaScript. Use the hooks in `app/lib/environment.ts`; their prerender values are the safe ones (no WebGL, reduced motion).
- Scene colours come from the CSS tokens through `resolveCssColor`, not from hex values in TypeScript.

## Content rules

- The relay service is invite-only. Never publish provider names, regions, node roles, hostnames, IPs, the subscription token scheme, or a link to the deploy repository.
- The main call to action is the app download.
