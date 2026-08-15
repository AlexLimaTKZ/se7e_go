import { describe, expect, it } from "vitest";

describe("quote input validation", () => {
  it("normalizes status and recomputes every monetary total on the server", async () => {
    const implementation = await import("./quote-input").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const result = implementation.parseQuoteInput({
      client: { name: "Cliente", address: "Rua", phone: "999" },
      quote_number: "010",
      date: "2026-08-14",
      status: "concluído",
      discount: "5,00",
      total: "999999",
      items: [
        {
          title: "Box",
          quantity: "2",
          unit_price: "10,00",
          total_price: "999",
        },
        {
          title: "Janela",
          total_price: "999",
          dimensions: [
            { label: "Suíte", quantity: "2", unit_price: "50,00" },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("concluido");
    expect(result.data.items[0].totalPrice).toBe(20);
    expect(result.data.items[1].totalPrice).toBe(100);
    expect(result.data.total).toBe(115);
  });

  it("rejects malformed, empty and negative quote data", async () => {
    const implementation = await import("./quote-input").catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const result = implementation.parseQuoteInput({
      client: { name: "" },
      quote_number: "",
      date: "not-a-date",
      discount: "-10",
      items: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
  });
});
