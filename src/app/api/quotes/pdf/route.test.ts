// @vitest-environment node

import { describe, expect, it } from "vitest";

async function loadRoute() {
  return import("./route").catch(() => null);
}

const validQuote = {
  client: { name: "Cliente da Rota", address: "Rua Dois", phone: "86999990000" },
  quote_number: "456",
  date: "2026-08-14",
  items: [{ title: "Porta", quantity: 1, unit_price: 1200 }],
};

describe("POST /api/quotes/pdf", () => {
  it("returns a private downloadable PDF", async () => {
    const route = await loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    const response = await route.POST(new Request("http://localhost/api/quotes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validQuote),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-disposition")).toContain("Orcamento-456-Cliente-da-Rota.pdf");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()).subarray(0, 5)))
  .toEqual([37, 80, 68, 70, 45]);
}, 15_000);

  it("rejects incomplete quote data with actionable issues", async () => {
    const route = await loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    const response = await route.POST(new Request("http://localhost/api/quotes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: {}, items: [] }),
    }));
    const body = await response.json() as { error?: string; issues?: string[] };

    expect(response.status).toBe(422);
    expect(body.error).toBe("Revise os dados antes de gerar o PDF.");
    expect(body.issues?.length).toBeGreaterThan(0);
  });

  it("rejects an oversized body even without a content-length header", async () => {
    const route = await loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    const response = await route.POST(new Request("http://localhost/api/quotes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validQuote, notes: "x".repeat(2 * 1024 * 1024) }),
    }));

    expect(response.status).toBe(413);
  });

  it("returns a client error for malformed JSON", async () => {
    const route = await loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    const response = await route.POST(new Request("http://localhost/api/quotes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    }));

    expect(response.status).toBe(400);
  });
});
