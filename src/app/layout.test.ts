import { describe, expect, it } from "vitest";
import { metadata, viewport } from "./layout";

describe("root mobile viewport", () => {
  it("resizes the page content so fixed actions stay above the Android keyboard", () => {
    expect(viewport.interactiveWidget).toBe("resizes-content");
  });
});

describe("SE7E site branding", () => {
  it("uses the company icons instead of the legacy Vercel favicon", () => {
    const serialized = JSON.stringify(metadata);

    expect(serialized).toContain("/icons/icon-192.png");
    expect(serialized).toContain("/icons/icon-512.png");
    expect(serialized).toContain("/icons/apple-touch-icon.png");
    expect(serialized).not.toContain("favicon.ico");
  });

  it("publishes the SE7E image for social link previews", () => {
    const serialized = JSON.stringify(metadata.openGraph);

    expect(serialized).toContain("SE7E Alumínio & Vidros");
    expect(serialized).toContain("/icons/icon-512.png");
  });
});
