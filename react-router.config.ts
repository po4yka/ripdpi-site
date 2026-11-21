import type { Config } from "@react-router/dev/config";

// No runtime server: the page is prerendered to HTML at build time, then hydrates into the full app.
export default {
  ssr: false,
  prerender: ["/"],
} satisfies Config;
