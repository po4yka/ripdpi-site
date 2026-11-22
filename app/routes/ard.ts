// Agentic Resource Discovery (ARD v0.9 draft) manifest, prerendered to /.well-known/ard.json and to the predecessor
// path /.well-known/ai-catalog.json. Lists only what the site really offers; the relay service stays out of it.
import { SITE, TITLE } from "~/story/chapters";

const MANIFEST = {
  specVersion: "0.9",
  host: { displayName: "RIPDPI", url: `${SITE}/` },
  entries: [
    {
      identifier: "urn:air:ripdpi.dev:skill:install-ripdpi",
      displayName: "Install RIPDPI",
      type: "application/agent-skills+md",
      url: `${SITE}/.well-known/agent-skills/install-ripdpi/SKILL.md`,
      representativeQueries: [
        "How do I install RIPDPI on Android?",
        "Which RIPDPI APK should I download for my phone?",
        "How do I verify the RIPDPI APK checksum?",
        "Should I use VPN mode or proxy mode in RIPDPI?",
      ],
    },
    {
      identifier: "urn:air:ripdpi.dev:docs:overview",
      displayName: TITLE,
      type: "text/markdown",
      url: `${SITE}/index.md`,
      representativeQueries: [
        "Android app to find out why a site does not open on my network",
        "Does RIPDPI need root?",
        "Is RIPDPI a VPN service?",
        "Open-source Android tool against deep packet inspection",
      ],
    },
  ],
};

export function loader() {
  return Response.json(MANIFEST);
}
