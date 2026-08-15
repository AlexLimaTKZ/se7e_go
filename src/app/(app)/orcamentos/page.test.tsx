import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams("status=aprovado"),
}));
vi.mock("@/components/pdf/quote-preview", () => ({
  QuotePreview: () => null,
}));

import QuotesListPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("QuotesListPage status filter", () => {
  it("reads the dashboard status, marks it active and sends it to the API", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => {
      void _input;
      return Response.json({ items: [], total: 0, totalPages: 1 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<QuotesListPage />);

    const approved = await screen.findByRole("link", { name: "Aprovados" });
    expect(approved.getAttribute("aria-current")).toBe("page");
    await waitFor(() => {
      expect(String(fetchMock.mock.calls[0][0])).toContain("status=aprovado");
    });
  });

  it("uses the compatible Brazilian WhatsApp identifier on iPhone", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      items: [{
        id: 1,
        quoteNumber: "5044",
        clientName: "Dr Magno",
        clientPhone: "(86) 99597-1050",
        date: "2026-08-14",
        total: 1102,
        status: "aprovado",
      }],
      total: 1,
      totalPages: 1,
    })));
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<QuotesListPage />);

    const [whatsAppButton] = await screen.findAllByRole("button", {
      name: "Enviar mensagem pelo WhatsApp",
    });
    fireEvent.click(whatsAppButton);

    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("wa.me/558695971050?"),
      "_blank",
      "noopener,noreferrer",
    );
  });
});
