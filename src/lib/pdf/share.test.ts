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
    expect(helpers.normalizeBrazilianWhatsAppPhone("086 99999-1234"))
      .toBe("5586999991234");
  });

  it("can use the legacy WhatsApp identifier for Brazilian iPhones outside early ninth-digit areas", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.buildWhatsAppUrl("(86) 99597-1050", "Mensagem", {
      preferLegacyBrazilianMobile: true,
    })).toContain("wa.me/558695971050?");
    expect(helpers.buildWhatsAppUrl("(86) 99597-1050", "Mensagem"))
      .toContain("wa.me/5586995971050?");
  });

  it("builds a direct WhatsApp Web URL for desktop browsers", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.buildWhatsAppUrl("(86) 99597-1050", "Olá cliente", { useWeb: true }))
      .toBe("https://web.whatsapp.com/send?phone=5586995971050&text=Ol%C3%A1%20cliente");
  });

  it("detects iPhone and touch-enabled iPad user agents", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.isAppleMobileDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", platform: "iPhone", maxTouchPoints: 5 })).toBe(true);
    expect(helpers.isAppleMobileDevice({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(helpers.isAppleMobileDevice({ userAgent: "Mozilla/5.0 (Linux; Android 15)", platform: "Linux armv8l", maxTouchPoints: 5 })).toBe(false);
  });

  it("distinguishes desktop browsers from mobile devices", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    expect(helpers.isMobileDevice({ userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Mobile Safari/537.36" })).toBe(true);
    expect(helpers.isMobileDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148" })).toBe(true);
    expect(helpers.isMobileDevice({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36" })).toBe(false);
  });

  it("builds a file-only native share payload so iOS cannot append a blob URL", async () => {
    const helpers = await loadModule();
    expect(helpers).not.toBeNull();
    if (!helpers) return;

    const file = new File(["pdf"], "orcamento.pdf", { type: "application/pdf" });
    expect(helpers.buildPdfFileShareData(file)).toEqual({ files: [file] });
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
