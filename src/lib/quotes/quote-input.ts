export const QUOTE_STATUSES = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
  "concluido",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

interface QuoteDimensionInput {
  label?: unknown;
  width?: unknown;
  height?: unknown;
  quantity?: unknown;
  unit_price?: unknown;
  unitPrice?: unknown;
  total_price?: unknown;
  totalPrice?: unknown;
}

interface QuoteItemInput extends QuoteDimensionInput {
  title?: unknown;
  image_url?: unknown;
  imageUrl?: unknown;
  glass?: unknown;
  aluminum?: unknown;
  aluminumColor?: unknown;
  hardware?: unknown;
  hardwareColor?: unknown;
  dimensions?: unknown;
}

export interface ParsedQuoteDimension {
  label: string;
  width: number | null;
  height: number | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
}

export interface ParsedQuoteItem extends ParsedQuoteDimension {
  title: string;
  imageUrl: string;
  glass: string;
  aluminumColor: string;
  hardwareColor: string;
  dimensions: ParsedQuoteDimension[];
}

export interface ParsedQuoteInput {
  client: { name: string; address: string; phone: string };
  quoteNumber: string;
  date: string;
  deliveryDate: string | null;
  validUntil: string | null;
  status: QuoteStatus;
  paymentConditions: string;
  discount: number;
  notes: string;
  items: ParsedQuoteItem[];
  total: number;
}

export type QuoteInputResult =
  | { ok: true; data: ParsedQuoteInput }
  | { ok: false; issues: string[] };

function text(value: unknown, maxLength = 2_000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function parseLocaleNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/gu, "").replace(",", ".");
  if (!normalized || !/^-?(?:\d+\.?\d*|\.\d+)$/u.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function optionalNonNegative(value: unknown, issue: string, issues: string[]): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseLocaleNumber(value);
  if (parsed === null || parsed < 0) issues.push(issue);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function quantity(value: unknown, issue: string, issues: string[]): number {
  const parsed = value === undefined || value === "" ? 1 : parseLocaleNumber(value);
  if (parsed === null || parsed <= 0 || !Number.isInteger(parsed)) {
    issues.push(issue);
    return 1;
  }
  return parsed;
}

function date(value: unknown, field: string, required: boolean, issues: string[]): string | null {
  const parsed = text(value, 10);
  if (!parsed && !required) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(parsed);
  const instant = match ? new Date(`${parsed}T00:00:00Z`) : null;
  if (
    !match ||
    !instant ||
    instant.getUTCFullYear() !== Number(match[1]) ||
    instant.getUTCMonth() + 1 !== Number(match[2]) ||
    instant.getUTCDate() !== Number(match[3])
  ) {
    issues.push(`${field} invalida.`);
    return null;
  }
  return parsed;
}

function normalizeStatus(value: unknown): QuoteStatus {
  const normalized = text(value, 30)
    .replaceAll("Ã­", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
  return QUOTE_STATUSES.includes(normalized as QuoteStatus)
    ? (normalized as QuoteStatus)
    : "rascunho";
}

function parseDimension(
  raw: QuoteDimensionInput,
  path: string,
  issues: string[],
): ParsedQuoteDimension {
  const parsedQuantity = quantity(raw.quantity, `${path}: quantidade invalida.`, issues);
  const unitPrice = optionalNonNegative(
    raw.unit_price ?? raw.unitPrice,
    `${path}: valor unitario invalido.`,
    issues,
  );
  const suppliedTotal = optionalNonNegative(
    raw.total_price ?? raw.totalPrice,
    `${path}: valor total invalido.`,
    issues,
  );
  const width = optionalNonNegative(raw.width, `${path}: largura invalida.`, issues);
  const height = optionalNonNegative(raw.height, `${path}: altura invalida.`, issues);

  return {
    label: text(raw.label, 200),
    width,
    height,
    quantity: parsedQuantity,
    unitPrice,
    totalPrice: unitPrice === null ? (suppliedTotal ?? 0) : parsedQuantity * unitPrice,
  };
}

export function parseQuoteInput(raw: unknown): QuoteInputResult {
  const issues: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, issues: ["Dados invalidos."] };

  const input = raw as Record<string, unknown>;
  const client = (input.client && typeof input.client === "object"
    ? input.client
    : {}) as Record<string, unknown>;
  const clientName = text(client.name, 200);
  const quoteNumber = text(input.quote_number ?? input.quoteNumber, 50);
  const quoteDate = date(input.date, "Data", true, issues);
  const deliveryDate = date(input.delivery_date ?? input.deliveryDate, "Data de entrega", false, issues);
  const validUntil = date(input.valid_until ?? input.validUntil, "Validade", false, issues);
  const discount = optionalNonNegative(input.discount, "Desconto invalido.", issues) ?? 0;
  const rawItems = Array.isArray(input.items) ? (input.items as QuoteItemInput[]) : [];

  if (!clientName) issues.push("Nome do cliente e obrigatorio.");
  if (!quoteNumber) issues.push("Numero do orcamento e obrigatorio.");
  if (rawItems.length === 0) issues.push("Adicione pelo menos um item.");
  if (rawItems.length > 250) issues.push("O orcamento excede o limite de 250 itens.");

  const items = rawItems.slice(0, 250).map((rawItem, itemIndex): ParsedQuoteItem => {
    const path = `Item ${itemIndex + 1}`;
    const title = text(rawItem.title, 300);
    if (!title) issues.push(`${path}: titulo e obrigatorio.`);
    const base = parseDimension(rawItem, path, issues);
    const rawDimensions = Array.isArray(rawItem.dimensions)
      ? (rawItem.dimensions as QuoteDimensionInput[])
      : [];
    if (rawDimensions.length > 250) issues.push(`${path}: muitas dimensoes.`);
    const dimensions = rawDimensions
      .slice(0, 250)
      .map((dimension, dimensionIndex) =>
        parseDimension(dimension, `${path}, dimensao ${dimensionIndex + 1}`, issues),
      );

    return {
      ...base,
      title,
      imageUrl: text(rawItem.image_url ?? rawItem.imageUrl, 2_000),
      glass: text(rawItem.glass, 300),
      aluminumColor: text(rawItem.aluminum ?? rawItem.aluminumColor, 300),
      hardwareColor: text(rawItem.hardware ?? rawItem.hardwareColor, 300),
      dimensions,
      totalPrice:
        dimensions.length > 0
          ? dimensions.reduce((sum, dimension) => sum + dimension.totalPrice, 0)
          : base.totalPrice,
    };
  });

  if (issues.length > 0 || quoteDate === null) return { ok: false, issues };

  const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return {
    ok: true,
    data: {
      client: {
        name: clientName,
        address: text(client.address, 500),
        phone: text(client.phone, 100),
      },
      quoteNumber,
      date: quoteDate,
      deliveryDate,
      validUntil,
      status: normalizeStatus(input.status),
      paymentConditions: text(input.payment_conditions ?? input.paymentConditions),
      discount,
      notes: text(input.notes, 10_000),
      items,
      total: Math.max(0, itemsTotal - discount),
    },
  };
}
