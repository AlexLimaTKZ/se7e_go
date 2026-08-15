import { describe, expect, it } from "vitest";

describe("image upload validation", () => {
  it("checks size, declared type and file signature", async () => {
    const implementation = await import("./image-file").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(
      implementation.validateImageUpload(
        { name: "produto.png", size: png.byteLength, type: "image/png" },
        png,
      ),
    ).toEqual({ ok: true, extension: "png", mimeType: "image/png" });

    expect(
      implementation.validateImageUpload(
        { name: "produto.png", size: png.byteLength, type: "image/jpeg" },
        png,
      ).ok,
    ).toBe(false);
    expect(
      implementation.validateImageUpload(
        { name: "produto.svg", size: 20, type: "image/svg+xml" },
        new Uint8Array([60, 115, 118, 103]),
      ).ok,
    ).toBe(false);
    expect(
      implementation.validateImageUpload(
        { name: "huge.png", size: implementation.MAX_IMAGE_BYTES + 1, type: "image/png" },
        png,
      ).ok,
    ).toBe(false);
  });
});
