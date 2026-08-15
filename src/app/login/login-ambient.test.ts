// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesheetPath = fileURLToPath(new URL("./login-ambient.module.css", import.meta.url));

describe("login ambient animation", () => {
  it("uses scoped transform/opacity animations with a reduced-motion fallback", () => {
    expect(existsSync(stylesheetPath)).toBe(true);
    const stylesheet = existsSync(stylesheetPath) ? readFileSync(stylesheetPath, "utf8") : "";

    expect(stylesheet).toContain("@keyframes ambient-sweep");
    expect(stylesheet).toContain("@keyframes security-breathe");
    expect(stylesheet).toContain("transform:");
    expect(stylesheet).toContain("opacity:");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("starts the mobile technical grid immediately with compositor-safe motion", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toContain("@keyframes mobile-grid-reveal");
    expect(stylesheet).toContain("@keyframes mobile-grid-drift");
    expect(stylesheet).toContain("@keyframes mobile-glow-sweep");
    expect(stylesheet).toContain("mobile-grid-reveal 250ms");
    expect(stylesheet).toContain("mobile-grid-drift 16s linear 0s infinite alternate");
    expect(stylesheet).toContain("mobile-glow-sweep 12s");
    expect(stylesheet).toContain("pointer-events: none");
    expect(stylesheet).toContain("translate3d");
  });

  it("starts the desktop sweep immediately and crosses the panel more slowly", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toContain("ambient-sweep 16s");
    expect(stylesheet).toMatch(/animation:\s*ambient-sweep[^;]*\s0s\s+infinite/);
    expect(stylesheet).toMatch(/@keyframes ambient-sweep\s*{[\s\S]*?0%\s*{[\s\S]*?opacity:\s*0\.[1-9]/);
    expect(stylesheet).toMatch(/25%\s*{[\s\S]*?transform:\s*translate3d\(42%/);
  });

  it("keeps the outlined desktop brand subtly visible against the grid", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toMatch(/\.brand\s*{[\s\S]*?-webkit-text-stroke:\s*1px\s+rgb\(255 255 255 \/ 0\.18\)/);
    expect(stylesheet).toMatch(/\.brand\s*{[\s\S]*?text-shadow:\s*0 0 48px\s+rgb\(69 139 206 \/ 0\.09\)/);
  });
});
