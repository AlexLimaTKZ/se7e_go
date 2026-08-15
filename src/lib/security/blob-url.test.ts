import { describe, expect, it } from "vitest";

describe("Vercel Blob URL validation", () => {
  it("accepts only exact public Vercel Blob hosts", async () => {
    const implementation = await import("./blob-url").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    expect(
      implementation.isAllowedPublicBlobUrl(
        "https://store-id.public.blob.vercel-storage.com/catalog/image.png",
      ),
    ).toBe(true);
    expect(
      implementation.isAllowedPublicBlobUrl(
        "https://attacker.example/.public.blob.vercel-storage.com/image.png",
      ),
    ).toBe(false);
    expect(
      implementation.isAllowedPublicBlobUrl(
        "https://store.public.blob.vercel-storage.com.evil.example/image.png",
      ),
    ).toBe(false);
    expect(
      implementation.isAllowedPublicBlobUrl(
        "http://store.public.blob.vercel-storage.com/image.png",
      ),
    ).toBe(false);
    expect(
      implementation.isAllowedPublicBlobUrl(
        "https://user:pass@store.public.blob.vercel-storage.com/image.png",
      ),
    ).toBe(false);
  });
});
