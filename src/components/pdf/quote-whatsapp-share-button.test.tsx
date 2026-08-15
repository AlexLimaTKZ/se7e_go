import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast }));

import { QuoteWhatsAppShareButton } from "./quote-whatsapp-share-button";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("QuoteWhatsAppShareButton", () => {
  it("links directly to the server route that opens the saved client chat", () => {
    render(
      <QuoteWhatsAppShareButton
        quoteId={5044}
        quoteNumber="5044"
        clientName="Dr Mágico de Oz"
        clientPhone="(86) 99597-1050"
      />,
    );

    const link = screen.getByRole("link", { name: "Compartilhar orçamento no WhatsApp" });
    expect(link.getAttribute("href")).toBe("/api/quotes/5044/whatsapp");
    expect(link.getAttribute("title")).toBe("WhatsApp + link do PDF");
  });

  it("blocks the action and explains when the client phone is invalid", () => {
    render(
      <QuoteWhatsAppShareButton
        quoteId={1}
        quoteNumber="5044"
        clientName="Cliente"
        clientPhone="123"
      />,
    );

    const button = screen.getByRole("button", { name: "Compartilhar orçamento no WhatsApp" });
    fireEvent.click(button);
    expect(toast.error).toHaveBeenCalledWith(
      "Cadastre um celular válido para o cliente antes de compartilhar.",
    );
  });
});
