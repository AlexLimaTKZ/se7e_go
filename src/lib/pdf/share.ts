export interface PdfShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
}

interface PlatformNavigator {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

interface WhatsAppUrlOptions {
  preferLegacyBrazilianMobile?: boolean;
  useWeb?: boolean;
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
  let digits = value.replace(/\D/gu, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : "";
}

const EARLY_NINTH_DIGIT_AREAS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
]);

function legacyBrazilianWhatsAppPhone(phone: string): string {
  if (phone.length !== 13 || !phone.startsWith("55")) return phone;
  const areaCode = phone.slice(2, 4);
  const subscriber = phone.slice(4);
  if (subscriber.length !== 9 || !subscriber.startsWith("9") || EARLY_NINTH_DIGIT_AREAS.has(areaCode)) {
    return phone;
  }
  return `55${areaCode}${subscriber.slice(1)}`;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string,
  options: WhatsAppUrlOptions = {},
): string | null {
  const canonicalPhone = normalizeBrazilianWhatsAppPhone(phone);
  const normalizedPhone = options.preferLegacyBrazilianMobile
    ? legacyBrazilianWhatsAppPhone(canonicalPhone)
    : canonicalPhone;
  if (!normalizedPhone) return null;

  const encodedMessage = encodeURIComponent(message);
  if (options.useWeb) {
    return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedMessage}`;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

export function isAppleMobileDevice(value: PlatformNavigator): boolean {
  return /iPhone|iPad|iPod/iu.test(value.userAgent || "") ||
    (value.platform === "MacIntel" && (value.maxTouchPoints || 0) > 1);
}

export function isMobileDevice(value: PlatformNavigator): boolean {
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/iu.test(value.userAgent || "") ||
    (value.platform === "MacIntel" && (value.maxTouchPoints || 0) > 1);
}

export function buildPdfFileShareData(file: File): ShareData {
  return { files: [file] };
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
