import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  loadSavedQuoteInput: vi.fn(),
  createQuoteShareToken: vi.fn(),
}));

vi.mock("@/lib/quotes/saved-quote", () => ({
  loadSavedQuoteInput: dependencies.loadSavedQuoteInput,
}));

vi.mock("@/lib/quotes/share-token", () => ({
  createQuoteShareToken: dependencies.createQuoteShareToken,
}));

import { GET } from "./route";

beforeEach(() => {
  process.env.AUTH_SECRET = "test-auth-secret-with-enough-entropy";
  dependencies.createQuoteShareToken.mockResolvedValue("signed-token");
  dependencies.loadSavedQuoteInput.mockResolvedValue({
    client: {
      name: "Dr Mágico de Oz",
      address: "Rua Jurema",
      phone: "(86) 99597-1050",
    },
    quoteNumber: "5044",
    date: "2026-08-14",
    deliveryDate: null,
    validUntil: null,
    status: "rascunho",
    paymentConditions: "Pix",
    discount: 0,
    notes: "",
    items: [],
    total: 6760,
  });
});

afterEach(() => {
  delete process.env.AUTH_SECRET;
  vi.clearAllMocks();
});

describe("GET /api/quotes/[id]/whatsapp", () => {
  it("redirects straight to the saved client number with the public quote viewer link", async () => {
    const request = new NextRequest("https://se7e-go.vercel.app/api/quotes/42/whatsapp", {
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 15)" },
    });

    const response = await GET(request, { params: Promise.resolve({ id: "42" }) });

    expect(response.status).toBe(307);
    const location = response.headers.get("location") || "";
    expect(location).toContain("https://wa.me/5586995971050?");
    expect(decodeURIComponent(location)).toContain(
      "https://se7e-go.vercel.app/compartilhar/orcamento/42?token=signed-token",
    );
    expect(decodeURIComponent(location)).toContain("orçamento #5044");
    expect(dependencies.createQuoteShareToken).toHaveBeenCalledWith(
      42,
      "test-auth-secret-with-enough-entropy",
    );
  });
});
