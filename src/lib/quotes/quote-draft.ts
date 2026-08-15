export const QUOTE_DRAFT_VERSION = 1;

export interface QuoteDraft<T = unknown> {
  version: typeof QUOTE_DRAFT_VERSION;
  savedAt: number;
  data: T;
}

export function serializeQuoteDraft<T>(data: T, savedAt = Date.now()): string {
  return JSON.stringify({ version: QUOTE_DRAFT_VERSION, savedAt, data });
}

export function parseQuoteDraft<T = unknown>(serialized: string): QuoteDraft<T> | null {
  try {
    const parsed = JSON.parse(serialized) as Partial<QuoteDraft<T>>;
    if (
      parsed.version !== QUOTE_DRAFT_VERSION ||
      typeof parsed.savedAt !== "number" ||
      !("data" in parsed)
    ) {
      return null;
    }
    return parsed as QuoteDraft<T>;
  } catch {
    return null;
  }
}
