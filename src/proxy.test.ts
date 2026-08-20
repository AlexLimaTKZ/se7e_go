import { NextRequest } from "next/server";
import { unstable_doesProxyMatch } from "next/experimental/testing/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  verifyToken: vi.fn(async () => false),
}));

vi.mock("@/lib/auth", () => auth);

import { config, proxy } from "./proxy";

beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyToken.mockResolvedValue(false);
});

describe("proxy authentication", () => {
  it("matches the application root when basePath is /go", () => {
    expect(
      unstable_doesProxyMatch({
        config,
        nextConfig: { basePath: "/go" },
        url: "/go",
      }),
    ).toBe(true);
  });

  it("redirects an unauthenticated request from /go to /go/login", async () => {
    const response = await proxy(new NextRequest("https://www.se7ealuminio.com.br/go"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.se7ealuminio.com.br/go/login",
    );
  });

  it("rejects an invalid auth token at /go", async () => {
    const request = new NextRequest("https://www.se7ealuminio.com.br/go", {
      headers: { cookie: "auth-token=invalid" },
    });
    const response = await proxy(request);

    expect(auth.verifyToken).toHaveBeenCalledWith("invalid");
    expect(response.headers.get("location")).toBe(
      "https://www.se7ealuminio.com.br/go/login",
    );
  });

  it("allows a valid auth token at /go", async () => {
    auth.verifyToken.mockResolvedValue(true);
    const request = new NextRequest("https://www.se7ealuminio.com.br/go", {
      headers: { cookie: "auth-token=valid" },
    });
    const response = await proxy(request);

    expect(auth.verifyToken).toHaveBeenCalledWith("valid");
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy compact quote links", () => {
  it("rewrites a compact public URL under /go to the signed quote viewer", async () => {
    const code = "1z.abcd12.ABCDEFGHIJKLMN";
    const response = await proxy(new NextRequest(`https://se7e-go.vercel.app/go/o/${code}`));

    const rewrite = response.headers.get("x-middleware-rewrite") || "";
    expect(rewrite).toContain("/go/compartilhar/orcamento/71");
    expect(decodeURIComponent(rewrite)).toContain(`token=${code}`);
  });

  it("does not rewrite malformed compact URLs", async () => {
    const response = await proxy(new NextRequest("https://se7e-go.vercel.app/go/o/invalido"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });
});
