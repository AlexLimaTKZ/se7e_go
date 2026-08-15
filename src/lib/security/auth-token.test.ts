import { describe, expect, it } from "vitest";

describe("signed session tokens", () => {
  it("creates unique, signed and expiring tokens", async () => {
    const implementation = await import("./auth-token").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const secret = "a-production-length-secret-value";
    const first = await implementation.createSessionToken(secret, {
      now: 1_000,
      nonce: "nonce-a",
      ttlSeconds: 60,
    });
    const second = await implementation.createSessionToken(secret, {
      now: 1_000,
      nonce: "nonce-b",
      ttlSeconds: 60,
    });

    expect(first).not.toBe(second);
    expect(await implementation.verifySessionToken(first, secret, { now: 30_000 })).toBe(
      true,
    );
    expect(
      await implementation.verifySessionToken(`${first.slice(0, -1)}x`, secret, {
        now: 30_000,
      }),
    ).toBe(false);
    expect(await implementation.verifySessionToken(first, secret, { now: 62_000 })).toBe(
      false,
    );
  });
});
