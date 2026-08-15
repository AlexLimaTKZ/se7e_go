export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type SupportedMimeType = "image/gif" | "image/jpeg" | "image/png" | "image/webp";

type ValidationResult =
  | { ok: true; extension: "gif" | "jpg" | "png" | "webp"; mimeType: SupportedMimeType }
  | { ok: false; error: string };

function matches(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function detectImageType(bytes: Uint8Array): Exclude<ValidationResult, { ok: false }> | null {
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ok: true, extension: "png", mimeType: "image/png" };
  }
  if (matches(bytes, [0xff, 0xd8, 0xff])) {
    return { ok: true, extension: "jpg", mimeType: "image/jpeg" };
  }
  if (
    matches(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matches(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return { ok: true, extension: "gif", mimeType: "image/gif" };
  }
  if (
    matches(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { ok: true, extension: "webp", mimeType: "image/webp" };
  }
  return null;
}

export function validateImageUpload(
  file: { name: string; size: number; type: string },
  bytes: Uint8Array,
): ValidationResult {
  if (file.size <= 0) return { ok: false, error: "O arquivo esta vazio." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "A imagem deve ter no maximo 10 MB." };
  }

  const detected = detectImageType(bytes);
  if (!detected) return { ok: false, error: "Formato de imagem nao permitido." };
  if (file.type.toLowerCase() !== detected.mimeType) {
    return { ok: false, error: "O conteudo do arquivo nao corresponde ao tipo informado." };
  }
  return detected;
}

export function createSafeImageName(extension: string): string {
  return `catalogo/${crypto.randomUUID()}.${extension}`;
}
