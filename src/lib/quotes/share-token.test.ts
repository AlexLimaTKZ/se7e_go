import { describe, expect, it } from "vitest";
import { createQuoteShareToken, verifyQuoteShareToken } from "./share-token";

describe("quote share tokens", () => {
  const secret = "test-secret-with-enough-entropy-for-signing";
  const now = Date.UTC(2026, 7, 15, 13, 0, 0);

  it("accepts a valid token only for the quote it was issued for", async () => {
    const token = await createQuoteShareToken(42, secret, {
      now,
      nonce: "fixed-nonce",
      ttlSeconds: 60,
    });

    await expect(verifyQuoteShareToken(token, 42, secret, { now: now + 30_000 })).resolves.toBe(true);
    await expect(verifyQuoteShareToken(token, 43, secret, { now: now + 30_000 })).resolves.toBe(false);
  });

  it("rejects expired and tampered tokens", async () => {
    const token = await createQuoteShareToken(42, secret, {
      now,
      nonce: "fixed-nonce",
      ttlSeconds: 60,
    });

    await expect(verifyQuoteShareToken(token, 42, secret, { now: now + 61_000 })).resolves.toBe(false);
    await expect(verifyQuoteShareToken(`${token}x`, 42, secret, { now: now + 30_000 })).resolves.toBe(false);
  });
});
