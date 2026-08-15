// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  list: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => blob);

import { NextRequest } from "next/server";
import { POST } from "./route";

const PNG_1X1 = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/images", () => {
  it("uploads catalog images to the configured private Blob store", async () => {
    const privateUrl = "https://store.private.blob.vercel-storage.com/catalog/janela.png";
    blob.put.mockResolvedValue({ url: privateUrl, pathname: "catalog/janela.png" });
    const formData = new FormData();
    formData.set("file", new File([PNG_1X1], "janela.png", { type: "image/png" }));

    const response = await POST(new NextRequest("http://localhost/api/images", {
      method: "POST",
      body: formData,
    }));

    expect(response.status).toBe(200);
    expect(blob.put).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/u),
      expect.any(File),
      expect.objectContaining({ access: "private" }),
    );
  });
});
