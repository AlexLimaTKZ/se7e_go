export interface PdfShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
}

function safeFilenamePart(value: string, fallback: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
  return normalized || fallback;
}

export function buildQuotePdfFilename(quoteNumber: string, clientName: string): string {
  const number = safeFilenamePart(quoteNumber, "Sem-numero");
  const client = safeFilenamePart(clientName, "Cliente");
  return `Orcamento-${number}-${client}.pdf`;
}

export function buildQuoteShareText(clientName: string, quoteNumber: string): string {
  const firstName = clientName.trim().split(/\s+/u)[0] || "Cliente";
  const number = quoteNumber.trim() ? ` #${quoteNumber.trim()}` : "";
  return `Olá, ${firstName}! Conforme conversamos, segue o orçamento${number} detalhado referente ao seu projeto. Fico à disposição para esclarecer dúvidas.`;
}

export function normalizeBrazilianWhatsAppPhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  if (!digits) return "";
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits
    : `55${digits}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalizedPhone = normalizeBrazilianWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function canSharePdfFile(
  shareNavigator: PdfShareNavigator,
  file: File,
): boolean {
  if (typeof shareNavigator.share !== "function" || typeof shareNavigator.canShare !== "function") {
    return false;
  }

  try {
    return shareNavigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function isShareCancellation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}

export function isShareActivationError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "NotAllowedError");
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
