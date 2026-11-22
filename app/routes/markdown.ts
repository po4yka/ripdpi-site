// The page as Markdown for agents, prerendered to /index.md from the same words the page renders.
import { CHAPTERS, DESCRIPTION, RELEASES_URL, REPO_URL, SITE, TITLE } from "~/story/chapters";
import { EXTRAS, FAQ, FEATURES, STEPS } from "~/story/content";

const story = CHAPTERS.filter((c) => c.note).map((c) => `- **${c.caption}** ${c.note}`);

const MARKDOWN = [
  `# ${TITLE}`,
  `> ${DESCRIPTION}`,
  `[Download for Android](${RELEASES_URL}) · Android 8.1+ · AGPL-3.0 · [Source code](${REPO_URL})`,
  "## The story",
  story.join("\n"),
  "## How it works",
  STEPS.map((s, i) => `${i + 1}. **${s.title}.** ${s.text}`).join("\n"),
  "## Features",
  FEATURES.map((f) => `### ${f.title}\n\n${f.text}\n\n![${f.alt}](${SITE}${f.image})`).join("\n\n"),
  EXTRAS.map((e) => `- **${e.title}.** ${e.text}`).join("\n"),
  "## Questions",
  FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n"),
  "## Get RIPDPI",
  `- [Latest release for Android](${RELEASES_URL})\n- [Source code and README](${REPO_URL})\n- [Agent skill: install RIPDPI](${SITE}/.well-known/agent-skills/install-ripdpi/SKILL.md)`,
].join("\n\n") + "\n";

export function loader() {
  return new Response(MARKDOWN, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
