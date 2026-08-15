// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseQuoteInput } from "@/lib/quotes/quote-input";

async function loadModule() {
  return import("./quote-pdf").catch(() => null);
}

describe("quote PDF rendering", () => {
  it("renders a valid PDF from normalized quote data", async () => {
    const renderer = await loadModule();
    expect(renderer).not.toBeNull();
    if (!renderer) return;

    const parsed = parseQuoteInput({
      client: { name: "Cliente Teste", address: "Rua Um", phone: "86999991234" },
      quote_number: "123",
      date: "2026-08-14",
      delivery_date: "2026-08-30",
      valid_until: "2026-08-20",
      payment_conditions: "50% na entrada",
      discount: 10,
      notes: "Teste de geração",
      items: [
        {
          title: "Box de vidro",
          width: 1.2,
          height: 1.5,
          quantity: 2,
          unit_price: 500,
        },
        {
          title: "Janela de correr",
          dimensions: [
            {
              label: "Sala",
              width: 1000,
              height: 2000,
              quantity: 2,
              unit_price: 500,
            },
            {
              label: "Cozinha",
              width: 3000,
              height: 2000,
              quantity: 2,
              unit_price: 300,
            },
          ],
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const bytes = await renderer.renderQuotePdf(parsed.data);
    expect(Array.from(bytes.subarray(0, 5))).toEqual([37, 80, 68, 70, 45]);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });
});
