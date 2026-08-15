import { describe, expect, it } from "vitest";
import { centsToMoney, moneyToCents } from "./money";

describe("money persistence helpers", () => {
  it("stores decimal reais as integer cents", () => {
    expect(moneyToCents(1500.5)).toBe(150050);
    expect(moneyToCents(1.005)).toBe(101);
    expect(moneyToCents(0.1 + 0.2)).toBe(30);
  });

  it("restores integer cents as decimal reais", () => {
    expect(centsToMoney(150050)).toBe(1500.5);
    expect(centsToMoney(30)).toBe(0.3);
  });

  it("rejects invalid numeric values", () => {
    expect(() => moneyToCents(Number.NaN)).toThrow();
    expect(() => centsToMoney(Number.POSITIVE_INFINITY)).toThrow();
  });
});
