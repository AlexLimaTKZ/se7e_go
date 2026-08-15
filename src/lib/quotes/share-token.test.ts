import { describe, expect, it } from "vitest";
import {
  createQuoteShareCode,
  createQuoteShareToken,
  getQuoteIdFromShareCode,
  verifyQuoteShareToken,
} from "./share-token";

describe("quote share tokens", () => {
  const secret = "test-secret-with-enough-entropy-for-signing";
  const now = Date.UTC(2026, 7, 15, 13, 0, 0);

  it("accepts a valid legacy token only for the quote it was issued for", async () => {
    const token = await createQuoteShareToken(42, secret, {
      now,
      nonce: "fixed-nonce",
      ttlSeconds: 60,
    });

    await expect(verifyQuoteShareToken(token, 42, secret, { now: now + 30_000 })).resolves.toBe(true);
    await expect(verifyQuoteShareToken(token, 43, secret, { now: now + 30_000 })).resolves.toBe(false);
  });

  it("rejects expired and tampered legacy tokens", async () => {
    const token = await createQuoteShareToken(42, secret, {
      now,
      nonce: "fixed-nonce",
      ttlSeconds: 60,
    });

    await expect(verifyQuoteShareToken(token, 42, secret, { now: now + 61_000 })).resolves.toBe(false);
    await expect(verifyQuoteShareToken(`${token}x`, 42, secret, { now: now + 30_000 })).resolves.toBe(false);
  });

  it("creates a compact code that resolves and validates only for its quote", async () => {
    const code = await createQuoteShareCode(71, secret, { now, ttlSeconds: 120 });

    expect(code.length).toBeLessThan(30);
    expect(getQuoteIdFromShareCode(code)).toBe(71);
    await expect(verifyQuoteShareToken(code, 71, secret, { now: now + 60_000 })).resolves.toBe(true);
    await expect(verifyQuoteShareToken(code, 72, secret, { now: now + 60_000 })).resolves.toBe(false);
  });

  it("rejects expired and tampered compact codes", async () => {
    const code = await createQuoteShareCode(71, secret, { now, ttlSeconds: 120 });
    const tampered = `${code.slice(0, -1)}${code.endsWith("A") ? "B" : "A"}`;

    await expect(verifyQuoteShareToken(code, 71, secret, { now: now + 121_000 })).resolves.toBe(false);
    await expect(verifyQuoteShareToken(tampered, 71, secret, { now: now + 60_000 })).resolves.toBe(false);
    expect(getQuoteIdFromShareCode("invalid-code")).toBeNull();
  });
});
