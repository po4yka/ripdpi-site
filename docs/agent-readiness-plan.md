# Agent readiness plan for ripdpi.dev

Scan date: 2026-11-22. Source: https://isitagentready.com/ripdpi.dev

## Current state

Score 20, level 1 ("Basic Web Presence").

| Category | Result | Passes | Fails |
|---|---|---|---|
| Discoverability | 2/4 | robots.txt, sitemap | Link headers, DNS-AID |
| Content | 0/1 | | Markdown negotiation (`Accept: text/markdown`) |
| Bot access control | 1/2 | AI bot rules in robots.txt | Content Signals |
| API, auth, MCP and skill discovery | 0/8 | | API catalog, OAuth/OIDC discovery, OAuth protected resource, auth.md, MCP server card, Agent Skills index, WebMCP, ARD (`ai-catalog.json`) |
| Commerce | not scored | | |

Already good and not seen by the scanner: `/llms.txt`, prerendered HTML with about 700 words of real text, `SoftwareApplication` and `FAQPage` JSON-LD, canonical link, Open Graph tags.

## Changes

Ordered by value to agents per unit of work. Items 1 to 5 fix real gaps; item 6 is cheap score; the rest are skipped on purpose.

### 1. Content Signals in robots.txt (5 min)

Add to `public/robots.txt`:

```
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
```

The landing page wants reach, so all three are `yes`. Decision for the owner: `ai-train=no` if model training on the text is not wanted. The signal is a preference, not enforcement.

### 2. Markdown version of the page (1-2 h)

Agents pay 5-10x fewer tokens on Markdown, and the HTML here carries the 3D app shell.

- Done: `app/routes/markdown.ts` is a resource route, prerendered to `build/client/index.md` from the same sources the page uses (`app/story/chapters.ts`, `app/story/content.ts`). One source of truth, so the Markdown cannot drift from the page.
- `public/llms.txt` stays hand-written and links to `index.md` and the skill. No `llms-full.txt`: `index.md` is the full text.
- Add `<link rel="alternate" type="text/markdown" href="/index.md">` to the page head.

### 3. Markdown negotiation on `/` (15 min to try, fallback 1 h)

First try the zero-code path: turn on "Markdown for Agents" for the ripdpi.dev zone in the Cloudflare dashboard (AI Crawl Control), then check:

```bash
curl -sI -H 'Accept: text/markdown' https://ripdpi.dev/ | rg -i 'content-type|x-markdown-tokens'
```

Cloudflare documents this for HTML from the origin; it does not say whether Worker static assets are converted. If the check fails, the fallback is a small Worker script that returns `index.md` when `Accept` contains `text/markdown` and passes everything else to `env.ASSETS`. That breaks the "static assets only, no worker script" rule in `AGENTS.md`, so it needs the owner's OK. With item 2 in place, agents still get Markdown at `/index.md` without negotiation.

### 4. Link headers (10 min)

In `public/_headers`, for `/` only:

```
/
  Link: </llms.txt>; rel="describedby"; type="text/plain", </index.md>; rel="alternate"; type="text/markdown", </sitemap.xml>; rel="sitemap", </.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json"
```

### 5. Agent Skills index with one real skill (1 h)

The one action an agent can do for a user here is "install RIPDPI". Publish it as a skill:

- Done as resource routes in `app/routes/skill.ts`; the skill text is `app/agents/install-ripdpi.md`, and the digest is computed at prerender. `SKILL.md`: how to get the latest APK from GitHub Releases, check the Android version (8.1+), choose VPN mode or proxy mode, where to read the docs. No relay details (content rules).
- `index.json` per Agent Skills Discovery RFC v0.2.0: `$schema`, `skills[]` with `name`, `type: "skill-md"`, `description`, `url`, `digest` (`sha256:` + hex of the raw SKILL.md bytes).

### 6. ARD manifest (30 min, mostly for the score)

`public/.well-known/ai-catalog.json` with `specVersion`, `host`, and entries for `llms.txt`, `index.md` and the skill index, each with a `urn:air:ripdpi.dev:...` id, `type`, `url`, and 2-5 `representativeQueries` ("Android DPI bypass app", "how to install RIPDPI"). Needs `Content-Type: application/json` and `Access-Control-Allow-Origin: *` for that path in `_headers`.

### 7. JSON-LD polish (15 min)

In `app/routes/home.tsx`: add `offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }` (Google needs it for SoftwareApplication rich results), `isAccessibleForFree: true`, `softwareVersion` from the latest release at build time if cheap, and an `author` Person. Validate with the Schema.org validator.

### 8. Explicit AI crawler rules (10 min, optional)

`User-agent: *` already allows everyone. Naming the main agents (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended) with `Allow: /` documents intent and survives a future `*` tightening. Also check that Cloudflare "Block AI bots" and AI Crawl Control do not block them at the edge, because that overrides robots.txt.

### Skipped on purpose

- API catalog, OAuth/OIDC discovery, OAuth protected resource, auth.md, MCP server card, Personal Agent Protocol: the site has no API and no sign-in. The relay service is invite-only and its details must not be published. Fake manifests would mislead agents. These 6 checks stay red; the score ceiling is accepted.
- WebMCP: the page has no action an agent can do in the browser beyond following the download link. Revisit if the page gets a form or a release picker.
- DNS-AID: DNS records for agent discovery, an early draft with no consumers yet. Revisit in 2027.
- Commerce: the app is free.

## Verification

1. `npm run check`.
2. Serve the build with the `ripdpi-site-worker` preview (`wrangler dev`) and check: `curl -I /` shows the `Link` header; `/index.md`, `/llms.txt`, `/.well-known/agent-skills/index.json`, `/.well-known/ai-catalog.json` return 200 with the right `Content-Type`; the browser console has no CSP violations.
3. Check the skill digest: `shasum -a 256` of `SKILL.md` matches `index.json`.
4. After deploy, rescan https://isitagentready.com/ripdpi.dev. Expected: Discoverability 3/4, Content 1/1 (if item 3 works), Bot access 2/2, discovery 2/8.

## Sources

- Cloudflare, Agent Readiness score: https://blog.cloudflare.com/agent-readiness/
- Cloudflare, Markdown for Agents: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents
- Agent Skills Discovery RFC: https://github.com/cloudflare/agent-skills-discovery-rfc
- Agent readiness spec: https://specification.website/spec/agent-readiness/
- Vercel, make your site readable by AI agents: https://vercel.com/kb/guide/make-your-site-readable-by-ai-agents
