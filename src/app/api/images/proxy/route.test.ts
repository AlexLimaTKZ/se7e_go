// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@vercel/blob", () => blob);

import { NextRequest } from "next/server";
import { GET } from "./route";

const imageUrl = "https://store.public.blob.vercel-storage.com/catalog/item.png";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/images/proxy", () => {
  it("streams a public image through the Vercel Blob SDK", async () => {
    const bytes = Uint8Array.from([137, 80, 78, 71]);
    blob.get.mockResolvedValue({
      statusCode: 200,
      stream: new Blob([bytes], { type: "image/png" }).stream(),
      headers: new Headers({ "Content-Type": "image/png" }),
      blob: {
        contentType: "image/png",
        size: bytes.byteLength,
      },
    });

    const response = await GET(new NextRequest(
      `http://localhost/api/images/proxy?url=${encodeURIComponent(imageUrl)}`,
    ));

    expect(blob.get).toHaveBeenCalledWith(
      imageUrl,
      expect.objectContaining({ access: "public" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(bytes));
  });
});
