import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  loadSavedQuoteInput: vi.fn(),
  createQuoteShareCode: vi.fn(),
}));

vi.mock("@/lib/quotes/saved-quote", () => ({
  loadSavedQuoteInput: dependencies.loadSavedQuoteInput,
}));

vi.mock("@/lib/quotes/share-token", () => ({
  createQuoteShareCode: dependencies.createQuoteShareCode,
}));

import { GET } from "./route";

beforeEach(() => {
  process.env.AUTH_SECRET = "test-auth-secret-with-enough-entropy";
  dependencies.createQuoteShareCode.mockResolvedValue("1z.abcd12.ABCDEFGHIJKLMN");
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
  it("keeps Android on the direct mobile WhatsApp URL", async () => {
    const request = new NextRequest("https://se7e-go.vercel.app/api/quotes/71/whatsapp", {
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Mobile Safari/537.36" },
    });

    const response = await GET(request, { params: Promise.resolve({ id: "71" }) });

    expect(response.status).toBe(307);
    const location = response.headers.get("location") || "";
    expect(location).toContain("https://wa.me/5586995971050?");
    const decoded = decodeURIComponent(location);
    expect(decoded).toContain("https://se7e-go.vercel.app/o/1z.abcd12.ABCDEFGHIJKLMN");
    expect(decoded).toContain("Visualizar orçamento:");
    expect(decoded).not.toContain("Visualizar orçamento em PDF");
    expect(decoded).toContain("orçamento #5044");
    expect(dependencies.createQuoteShareCode).toHaveBeenCalledWith(
      71,
      "test-auth-secret-with-enough-entropy",
    );
  });

  it("opens the saved client conversation directly in WhatsApp Web on desktop", async () => {
    const request = new NextRequest("https://se7e-go.vercel.app/api/quotes/71/whatsapp", {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36" },
    });

    const response = await GET(request, { params: Promise.resolve({ id: "71" }) });

    expect(response.status).toBe(307);
    const location = response.headers.get("location") || "";
    expect(location).toContain("https://web.whatsapp.com/send?phone=5586995971050&text=");
    expect(location).not.toContain("api.whatsapp.com");
    expect(location).not.toContain("wa.me/");
    expect(decodeURIComponent(location)).toContain(
      "https://se7e-go.vercel.app/o/1z.abcd12.ABCDEFGHIJKLMN",
    );
  });
});
