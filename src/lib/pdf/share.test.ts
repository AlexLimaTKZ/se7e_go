import { describe, expect, it, vi } from "vitest";

async function loadModule() {
  return import("./share").catch(() => null);
}

describe("PDF sharing helpers", () => {
  it("builds a readable and filesystem-safe PDF filename", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.buildQuotePdfFilename("012/A", "João da Silva & Filhos"))
      .toBe("Orcamento-012-A-Joao-da-Silva-Filhos.pdf");
  });

  it("normalizes Brazilian phone numbers without duplicating country code", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.normalizeBrazilianWhatsAppPhone("(86) 99999-1234"))
      .toBe("5586999991234");
    expect(helpers.normalizeBrazilianWhatsAppPhone("+55 (86) 99999-1234"))
      .toBe("5586999991234");
  });

  it("detects whether the device accepts sharing this PDF file", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    const file = new File(["pdf"], "orcamento.pdf", { type: "application/pdf" });
    const share = vi.fn(async () => undefined);
    const navigatorWithShare = {
      share,
      canShare: vi.fn(() => true),
    };

    expect(helpers.canSharePdfFile(navigatorWithShare, file)).toBe(true);
    expect(navigatorWithShare.canShare).toHaveBeenCalledWith({ files: [file] });
    expect(helpers.canSharePdfFile({ share }, file)).toBe(false);
  });

  it("distinguishes user cancellation from a real sharing error", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.isShareCancellation(new DOMException("Cancelado", "AbortError"))).toBe(true);
    expect(helpers.isShareCancellation({ name: "AbortError" })).toBe(true);
    expect(helpers.isShareCancellation(new Error("Falha"))).toBe(false);
  });

  it("identifies when the native share needs a fresh user tap", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.isShareActivationError({ name: "NotAllowedError" })).toBe(true);
    expect(helpers.isShareActivationError(new Error("Falha"))).toBe(false);
  });
});
