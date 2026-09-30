import { createHash } from "crypto";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

/** index.html's inline theme script only runs if vercel.json's CSP lists its exact hash. */
describe("CSP", () => {
  it("allows the inline theme script in index.html", () => {
    const html = readFileSync("index.html", "utf8");
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const csp = JSON.parse(readFileSync("vercel.json", "utf8")).headers[0].headers.find(
      (h: { key: string }) => h.key === "Content-Security-Policy",
    ).value as string;
    for (const script of scripts) {
      const hash = createHash("sha256").update(script).digest("base64");
      expect(csp, "index.html's inline script changed: update its sha256 in vercel.json").toContain(`'sha256-${hash}'`);
    }
  });
});
