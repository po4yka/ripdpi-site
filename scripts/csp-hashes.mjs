// Replaces 'unsafe-inline' in the built _headers script-src with the hashes of the inline scripts in the prerendered HTML.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = "build/client";
const placeholder = "script-src 'self' 'unsafe-inline'";
const hashes = new Set();

for (const file of readdirSync(dir).filter((name) => name.endsWith(".html"))) {
  const html = readFileSync(`${dir}/${file}`, "utf8");
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    // Scripts with src are covered by 'self'. JSON data blocks do not run.
    if (/\ssrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs) || body === "") continue;
    hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  }
}

const headers = readFileSync(`${dir}/_headers`, "utf8");
if (hashes.size === 0 || !headers.includes(placeholder)) {
  throw new Error(`csp-hashes: ${hashes.size} inline scripts, placeholder ${headers.includes(placeholder) ? "found" : "missing"}`);
}
writeFileSync(`${dir}/_headers`, headers.replace(placeholder, `script-src 'self' ${[...hashes].join(" ")}`));
console.log(`csp-hashes: ${hashes.size} inline script hashes written to ${dir}/_headers`);
