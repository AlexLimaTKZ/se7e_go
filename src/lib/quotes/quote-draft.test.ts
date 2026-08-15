import { describe, expect, it } from "vitest";

describe("quote draft persistence", () => {
  it("round-trips current drafts and rejects incompatible data", async () => {
    const implementation = await import("./quote-draft").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const data = { clientName: "Maria", items: [{ localId: "item-1" }] };
    const serialized = implementation.serializeQuoteDraft(data, 1234);

    expect(implementation.parseQuoteDraft(serialized)).toEqual({
      version: implementation.QUOTE_DRAFT_VERSION,
      savedAt: 1234,
      data,
    });
    expect(implementation.parseQuoteDraft("not-json")).toBeNull();
    expect(
      implementation.parseQuoteDraft(
        JSON.stringify({ version: implementation.QUOTE_DRAFT_VERSION - 1, data }),
      ),
    ).toBeNull();
  });
});
