import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("index.md", "routes/markdown.ts"),
  route(".well-known/agent-skills/index.json", "routes/skill.ts", { id: "skills-index" }),
  route(".well-known/agent-skills/install-ripdpi/SKILL.md", "routes/skill.ts", { id: "skill-install-ripdpi" }),
  route(".well-known/ard.json", "routes/ard.ts", { id: "ard" }),
  route(".well-known/ai-catalog.json", "routes/ard.ts", { id: "ai-catalog" }),
] satisfies RouteConfig;
