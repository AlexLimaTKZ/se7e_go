import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@vercel/blob", () => blob);

const PNG_1X1 = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));

function streamBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function loadModule() {
  return import("./pdf-image").catch(() => null);
}

describe("PDF image URL validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("reads public Vercel Blob images through the storage SDK before optimizing them", async () => {
    blob.get.mockResolvedValue({
      statusCode: 200,
      stream: streamBytes(PNG_1X1),
      headers: new Headers({ "Content-Type": "image/png" }),
      blob: {
        url: "https://store.public.blob.vercel-storage.com/item.png",
        downloadUrl: "https://store.public.blob.vercel-storage.com/item.png?download=1",
        pathname: "item.png",
        contentDisposition: "inline",
        cacheControl: "public, max-age=3600",
        uploadedAt: new Date(),
        etag: "etag",
        contentType: "image/png",
        size: PNG_1X1.byteLength,
      },
    });
    const images = await loadModule();
    expect(images).not.toBeNull();
    if (!images) return;

    const optimized = await images.fetchOptimizedPdfImage(
      "https://store.public.blob.vercel-storage.com/item.png",
    );

    expect(blob.get).toHaveBeenCalledWith(
      "https://store.public.blob.vercel-storage.com/item.png",
      expect.objectContaining({ access: "public" }),
    );
    expect(optimized?.format).toBe("jpg");
    expect(optimized?.data.byteLength).toBeGreaterThan(0);
  });
});
