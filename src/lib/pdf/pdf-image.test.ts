import { describe, expect, it } from "vitest";

async function loadModule() {
  return import("./pdf-image").catch(() => null);
}

describe("PDF image URL validation", () => {
  it("allows only the configured public image hosts", async () => {
    const images = await loadModule();
    expect(images).not.toBeNull();
    if (!images) return;

    expect(images.isAllowedPdfImageUrl("https://store.public.blob.vercel-storage.com/item.webp"))
      .toBe(true);
    expect(images.isAllowedPdfImageUrl("https://res.cloudinary.com/demo/image/upload/item.jpg"))
      .toBe(true);
    expect(images.isAllowedPdfImageUrl("https://res.cloudinary.com.evil.example/item.jpg"))
      .toBe(false);
    expect(images.isAllowedPdfImageUrl("http://127.0.0.1/private.png")).toBe(false);
  });
});
