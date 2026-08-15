import { describe, expect, it } from "vitest";
import {
  buildQuoteStatusHref,
  describeRevenueComparison,
  normalizeQuoteStatus,
} from "./dashboard-presentation";

describe("describeRevenueComparison", () => {
  it("does not invent growth when the previous month has no revenue", () => {
    expect(describeRevenueComparison(12_500, 0)).toMatchObject({
      kind: "neutral",
      label: "Sem base de comparação no mês anterior.",
    });
  });

  it("explains a month without approved revenue", () => {
    expect(describeRevenueComparison(0, 10_000)).toMatchObject({
      kind: "neutral",
      label: "Sem faturamento aprovado neste mês.",
    });
  });

  it("omits comparison when both months are empty", () => {
    expect(describeRevenueComparison(0, 0)).toEqual({
      kind: "neutral",
      label: "Ainda não há faturamento aprovado para comparar.",
      percentage: null,
    });
  });

  it("calculates a regular percentage with its direction", () => {
    expect(describeRevenueComparison(15_000, 10_000)).toEqual({
      kind: "positive",
      label: "+50,0% em relação ao mês anterior",
      percentage: 50,
    });
  });
});

describe("quote status presentation", () => {
  it("accepts supported statuses and normalizes the legacy completed spelling", () => {
    expect(normalizeQuoteStatus("aprovado")).toBe("aprovado");
    expect(normalizeQuoteStatus("concluído")).toBe("concluido");
  });

  it("rejects unsupported status values", () => {
    expect(normalizeQuoteStatus("javascript:alert(1)")).toBeNull();
    expect(normalizeQuoteStatus(null)).toBeNull();
  });

  it("builds a safe dashboard destination", () => {
    expect(buildQuoteStatusHref("rascunho")).toBe("/orcamentos?status=rascunho");
  });
});
