export const QUOTE_STATUSES = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
  "concluido",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface DashboardData {
  metrics: {
    monthlyRevenue: number;
    lastMonthRevenue: number;
    revenueGrowth: number;
    pendingCount: number;
    draftCount: number;
    sentCount: number;
    approvedCount: number;
    rejectedCount: number;
    completedCount: number;
    totalCount: number;
  };
  recentApproved: Array<{
    id: number;
    quoteNumber: string;
    clientName: string;
    total: number;
    date: string;
  }>;
  chartData: Array<{
    name: string;
    value: number;
  }>;
}

export type RevenueComparison = {
  kind: "positive" | "negative" | "neutral";
  label: string;
  percentage: number | null;
};

export function describeRevenueComparison(
  monthlyRevenue: number,
  lastMonthRevenue: number,
): RevenueComparison {
  if (monthlyRevenue <= 0 && lastMonthRevenue <= 0) {
    return {
      kind: "neutral",
      label: "Ainda não há faturamento aprovado para comparar.",
      percentage: null,
    };
  }

  if (lastMonthRevenue <= 0) {
    return {
      kind: "neutral",
      label: "Sem base de comparação no mês anterior.",
      percentage: null,
    };
  }

  if (monthlyRevenue <= 0) {
    return {
      kind: "neutral",
      label: "Sem faturamento aprovado neste mês.",
      percentage: null,
    };
  }

  const percentage = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  if (Math.abs(percentage) < 0.05) {
    return {
      kind: "neutral",
      label: "Mesmo faturamento do mês anterior.",
      percentage: 0,
    };
  }

  const formatted = Math.abs(percentage).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const kind = percentage > 0 ? "positive" : "negative";
  return {
    kind,
    label: `${percentage > 0 ? "+" : "-"}${formatted}% em relação ao mês anterior`,
    percentage,
  };
}

export function normalizeQuoteStatus(value: string | null | undefined): QuoteStatus | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "");

  return (QUOTE_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as QuoteStatus)
    : null;
}

export function buildQuoteStatusHref(status: QuoteStatus): string {
  return `/orcamentos?status=${encodeURIComponent(status)}`;
}
