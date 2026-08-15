// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  createAuthToken: vi.fn(async () => "signed-token"),
  passwordMatches: vi.fn(async () => false),
}));

const rateLimit = vi.hoisted(() => ({
  getRateLimitStatus: vi.fn(async () => ({ blocked: false, message: "" })),
  registerFailedLogin: vi.fn(async () => ({ blocked: false, message: "" })),
  resetLoginAttempts: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => auth);
vi.mock("@/lib/rate-limit", () => rateLimit);

import { POST } from "./route";

function loginRequest(body: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimit.getRateLimitStatus.mockResolvedValue({ blocked: false, message: "" });
  rateLimit.registerFailedLogin.mockResolvedValue({ blocked: false, message: "" });
  auth.passwordMatches.mockResolvedValue(false);
});

describe("POST /api/auth/login", () => {
  it("returns 400 for malformed JSON without checking a credential", async () => {
    const response = await POST(loginRequest("{not-json"));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(auth.passwordMatches).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { password: "" },
    { password: 1234 },
    { password: "x".repeat(257) },
  ])("returns 400 for an invalid payload: %j", async (payload) => {
    const response = await POST(loginRequest(JSON.stringify(payload)));

    expect(response.status).toBe(400);
    expect(auth.passwordMatches).not.toHaveBeenCalled();
  });

  it("preserves the secure session cookie after a successful login", async () => {
    auth.passwordMatches.mockResolvedValue(true);

    const response = await POST(loginRequest(JSON.stringify({ password: "correta" })));
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cookie).toContain("auth-token=signed-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(rateLimit.resetLoginAttempts).toHaveBeenCalledOnce();
  });

  it("accepts a correct password even when the shared IP is already rate limited", async () => {
    auth.passwordMatches.mockResolvedValue(true);
    rateLimit.getRateLimitStatus.mockResolvedValue({
      blocked: true,
      message: "Muitas tentativas. Tente novamente em 15 min.",
    });

    const response = await POST(loginRequest(JSON.stringify({ password: "correta" })));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("auth-token=signed-token");
  });

  it("does not make a correct login depend on rate-limit storage availability", async () => {
    auth.passwordMatches.mockResolvedValue(true);
    rateLimit.getRateLimitStatus.mockRejectedValue(new Error("database unavailable"));
    rateLimit.resetLoginAttempts.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(loginRequest(JSON.stringify({ password: "correta" })));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("auth-token=signed-token");
  });

  it("rejects an oversized streamed body without a content-length header", async () => {
    const response = await POST(loginRequest(JSON.stringify({ password: "x".repeat(2048) })));

    expect(response.status).toBe(413);
    expect(auth.passwordMatches).not.toHaveBeenCalled();
  });
});
