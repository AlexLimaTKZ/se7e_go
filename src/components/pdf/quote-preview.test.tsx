import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuotePreview } from "./quote-preview";

const previewProps: Parameters<typeof QuotePreview>[0] = {
  client: { name: "João da Silva", address: "Rua Três", phone: "(86) 99999-0000" },
  quote: {
    quote_number: "789",
    date: "2026-08-14",
    delivery_date: "",
    valid_until: "",
    payment_conditions: "",
    discount: 0,
    notes: "",
    total: 100,
    items: [{
      title: "Janela",
      image_url: "",
      width: 1,
      height: 1,
      glass: "Incolor",
      aluminum: "Preto",
      hardware: "Preto",
      quantity: 1,
      unit_price: 100,
      total_price: 100,
    }],
  },
  onClose: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("QuotePreview PDF actions", () => {
  it("shows clear share, download and print actions", () => {
    render(<QuotePreview {...previewProps} />);

    expect(screen.getByRole("button", { name: "Compartilhar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Baixar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeTruthy();
  });

  it("shares the generated PDF with a meaningful filename", async () => {
    const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(pdfBytes, {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    })));
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<QuotePreview {...previewProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar PDF" }));

    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const shareData = share.mock.calls[0][0] as ShareData;
    expect(shareData.files?.[0].name).toBe("Orcamento-789-Joao-da-Silva.pdf");
    expect(shareData.files?.[0].type).toBe("application/pdf");
    expect(shareData.text).toBeUndefined();
    expect(shareData.title).toBeUndefined();
    expect(shareData.url).toBeUndefined();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("orçamento #789"));
  });

  it("loads public product images eagerly from their permanent URL in the mobile preview", () => {
    render(<QuotePreview
      {...previewProps}
      quote={{
        ...previewProps.quote,
        items: [{
          ...previewProps.quote.items[0],
          image_url: "https://store.public.blob.vercel-storage.com/catalog/janela.png",
        }],
      }}
    />);

    const image = screen.getByRole("img", { name: "Janela" });
    expect(image.getAttribute("src"))
      .toBe("https://store.public.blob.vercel-storage.com/catalog/janela.png");
    expect(image.getAttribute("loading")).toBe("eager");
  });

  it("does not start a duplicate PDF request during Strict Mode preparation", async () => {
    let callCount = 0;
    let resolveActiveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }

      return new Promise<Response>((resolve) => {
        resolveActiveRequest = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StrictMode>
        <QuotePreview {...previewProps} />
      </StrictMode>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar PDF" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveActiveRequest?.(new Response(new Uint8Array([37, 80, 68, 70, 45]), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }));
    });
  });
});
