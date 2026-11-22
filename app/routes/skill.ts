// Agent skills, prerendered under /.well-known/agent-skills/ (Agent Skills Discovery RFC v0.2.0).
import SKILL from "~/agents/install-ripdpi.md?raw";

const SKILL_URL = "/.well-known/agent-skills/install-ripdpi/SKILL.md";
const DESCRIPTION = /^description: (.+)$/m.exec(SKILL)![1];

async function sha256(text: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loader({ request }: { request: Request }) {
  if (new URL(request.url).pathname === SKILL_URL) {
    return new Response(SKILL, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  }
  return Response.json({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      { name: "install-ripdpi", type: "skill-md", description: DESCRIPTION, url: SKILL_URL, digest: `sha256:${await sha256(SKILL)}` },
    ],
  });
}
