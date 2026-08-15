import { describe, expect, it } from "vitest";

describe("quote form state", () => {
  it("uses stable IDs and preserves untouched item references", async () => {
    const implementation = await import("./quote-state").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    let id = 0;
    const idFactory = () => `local-${++id}`;
    const first = implementation.createEmptyQuoteItem(idFactory);
    const second = implementation.createEmptyQuoteItem(idFactory);
    const items = [first, second];

    const changed = implementation.updateQuoteItem(items, first.localId, "unit_price", "10,50");
    expect(changed[0]).not.toBe(first);
    expect(changed[1]).toBe(second);
    expect(changed[0].localId).toBe(first.localId);
    expect(changed[0].total_price).toBe("10.50");

    const withDimension = implementation.addQuoteDimension(changed, first.localId, idFactory);
    expect(withDimension[0].dimensions[0].localId).toBe("local-3");
  });
});
