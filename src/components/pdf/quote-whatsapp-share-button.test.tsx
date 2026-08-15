import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast }));

import { QuoteWhatsAppShareButton } from "./quote-whatsapp-share-button";

const quoteDetail = {
  quoteNumber: "5044",
  date: "2026-08-14",
  deliveryDate: null,
  validUntil: null,
  payment_conditions: "Pix",
  discount: 0,
  notes: "",
  client: {
    name: "Dr Mágico de Oz",
    address: "Rua Jurema",
    phone: "(86) 99597-1050",
  },
  items: [{
    id: 10,
    title: "Box",
    image_url: null,
    width: 2000,
    height: 3000,
    glass: "Incolor",
    aluminum: "Branco",
    hardware: "Branco",
    quantity: 2,
    unit_price: 2580,
    total_price: 5160,
    dimensions: [],
  }],
};

function setNavigatorPlatform(userAgent: string, platform: string) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: userAgent });
  Object.defineProperty(navigator, "platform", { configurable: true, value: platform });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 5 });
}

function stubQuoteFetches() {
  const pdfBlob = new Blob(["%PDF-1.7 test"], { type: "application/pdf" });
  const detailResponse = {
    ok: true,
    json: vi.fn(async () => quoteDetail),
  } as unknown as Response;
  const pdfResponse = {
    ok: true,
    headers: new Headers({ "Content-Type": "application/pdf" }),
    blob: vi.fn(async () => pdfBlob),
  } as unknown as Response;

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/quotes/1") return detailResponse;
    if (url === "/api/quotes/pdf") return pdfResponse;
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  toast.success.mockReset();
  toast.info.mockReset();
  toast.error.mockReset();
});

describe("QuoteWhatsAppShareButton", () => {
  it("shares PDF and message together on Android", async () => {
    stubQuoteFetches();
    setNavigatorPlatform("Mozilla/5.0 (Linux; Android 15)", "Linux armv8l");
    const share = vi.fn(async (_data: ShareData) => undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });

    render(<QuoteWhatsAppShareButton quoteId={1} quoteNumber="5044" clientName="Dr Mágico de Oz" clientPhone="(86) 99597-1050" />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar orçamento no WhatsApp" }));

    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const payload = share.mock.calls[0][0];
    expect(payload.text).toContain("orçamento #5044");
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0].name).toBe("Orcamento-5044-Dr-Magico-de-Oz.pdf");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shares only the PDF on iPhone and copies the message", async () => {
    stubQuoteFetches();
    setNavigatorPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone");
    const share = vi.fn(async (_data: ShareData) => undefined);
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<QuoteWhatsAppShareButton quoteId={1} quoteNumber="5044" clientName="Dr Mágico de Oz" clientPhone="(86) 99597-1050" />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar orçamento no WhatsApp" }));

    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const payload = share.mock.calls[0][0];
    expect(payload.files).toHaveLength(1);
    expect(payload.text).toBeUndefined();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("orçamento #5044"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("downloads the PDF and opens WhatsApp when native file sharing is unavailable", async () => {
    stubQuoteFetches();
    setNavigatorPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32");
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn(async (_data: ShareData) => undefined) });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => false) });

    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<QuoteWhatsAppShareButton quoteId={1} quoteNumber="5044" clientName="Dr Mágico de Oz" clientPhone="(86) 99597-1050" />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar orçamento no WhatsApp" }));

    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("wa.me/5586995971050?"),
      "_blank",
      "noopener,noreferrer",
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
