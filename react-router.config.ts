import type { Config } from "@react-router/dev/config";

// No runtime server: the page is prerendered to HTML at build time, then hydrates into the full app. The other paths
// are resource routes for agents, prerendered to static files.
export default {
  ssr: false,
  prerender: ["/", "/index.md", "/.well-known/agent-skills/index.json", "/.well-known/agent-skills/install-ripdpi/SKILL.md"],
} satisfies Config;
