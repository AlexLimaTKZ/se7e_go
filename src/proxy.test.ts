import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(async () => false),
}));

import { proxy } from "./proxy";

describe("proxy compact quote links", () => {
  it("rewrites a compact public URL to the signed quote viewer", async () => {
    const code = "1z.abcd12.ABCDEFGHIJKLMN";
    const response = await proxy(new NextRequest(`https://se7e-go.vercel.app/o/${code}`));

    const rewrite = response.headers.get("x-middleware-rewrite") || "";
    expect(rewrite).toContain("/compartilhar/orcamento/71");
    expect(decodeURIComponent(rewrite)).toContain(`token=${code}`);
  });

  it("does not rewrite malformed compact URLs", async () => {
    const response = await proxy(new NextRequest("https://se7e-go.vercel.app/o/invalido"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });
});
