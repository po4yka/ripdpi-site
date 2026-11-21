# Vendored skills

Copied from upstream and reviewed before install: no hooks, all MIT. The first table is Markdown only. The second table has skills with scripts; review the script diff on every update. To update, copy from a newer commit and review the diff.

| Skills | Source | Commit |
|---|---|---|
| gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-react, gsap-performance, gsap-plugins, gsap-utils | https://github.com/greensock/gsap-skills (official, skills/) | aed9cfd3277740755f6bfc1155c7aa645403b760 |
| threejs-react-three-fiber, threejs-shaders, threejs-postprocessing, threejs-performance, threejs-fundamentals, threejs-interaction, threejs-geometry, threejs-materials, threejs-animation, threejs-lighting, threejs-textures | https://github.com/CloudAI-X/threejs-skills (skills/) | 0e181866f095b5f06d005133876e926515390d95 |
| make-interfaces-feel-better | https://github.com/jakubkrehel/make-interfaces-feel-better (skills/, without agents/) | 6d9f2f1df10e8ce2ae1708598a73b0506fb98794 |
| geo-technical, geo-schema, geo-llmstxt | https://github.com/zubair-trabzada/geo-seo-claude (skills/) | 989cae01e8ebbc42a9ec798eb9e7cb423f5ec89c |

## Skills with scripts

The scripts run only when a skill calls them. They were scanned at these commits: Python standard library plus optional Pillow, numpy and Playwright; Node built-ins; local headless Chrome and ffmpeg; no remote network calls.

| Skill | Source | Commit | Changes |
|---|---|---|---|
| ui-ux-pro-max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (.claude/skills/ui-ux-pro-max/) | 2de1134dc4d1cfe112934611ae5803ae17a1bd7e | Without scripts/tests/. In SKILL.md, the script path prefix `${CLAUDE_PLUGIN_ROOT}/` is removed so the path starts at the repository root. |
| pixel2motion | https://github.com/nolangz/pixel2motion (SKILL.md, references/, scripts/) | e9faedb28930df0da2acf17da00c80730a78cfe8 | Without docs/ and agents/. |
| line-art-animation | https://github.com/JDhruv14/line-art-animation (SKILL.md, lib/, references/, scripts/, examples/, project config) | c43d698913cf0ad44f984c7ae14c5348010594d3 | Without media/ and package-lock.json. |

## Not vendored

- https://github.com/CloudAI-X/threejs-skills: threejs-loaders and threejs-asset-pipeline, because the scene has no model or texture files. Add them with the first glTF or HDR asset.
- https://github.com/oso95/scroll-world: it makes a page from paid AI video clips. The site keeps the real-time scene.
- https://github.com/Vincentwei1021/video-shotcraft and https://github.com/kaankiziltug/logo-design-skill: they do not change the site code.

The user-level skill emil-design-eng also applies to motion and interaction decisions.
