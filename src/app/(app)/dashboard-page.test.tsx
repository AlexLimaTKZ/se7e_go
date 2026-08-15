import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/components/dashboard/quick-notes", () => ({
  QuickNotes: () => <div>Anotações</div>,
}));
vi.mock("@/components/dashboard/revenue-chart", () => ({
  RevenueChart: () => <div>Gráfico</div>,
}));
vi.mock("@/components/dashboard/recent-quotes", () => ({
  RecentQuotes: () => <div>Recentes</div>,
}));

import DashboardPage from "./page";

const dashboardData = {
  metrics: {
    monthlyRevenue: 1_000,
    lastMonthRevenue: 500,
    revenueGrowth: 100,
    pendingCount: 3,
    draftCount: 1,
    sentCount: 2,
    approvedCount: 4,
    rejectedCount: 1,
    completedCount: 2,
    totalCount: 10,
  },
  recentApproved: [],
  chartData: [],
};

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DashboardPage", () => {
  it("shows an actionable error and retries without presenting fake zero metrics", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(dashboardData));
    vi.stubGlobal("fetch", fetchMock);
    render(<DashboardPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar o dashboard");
    expect(screen.queryByText("R$ 0,00")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByText("R$ 1.000,00")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses semantic card headings and links status counters to filtered quotes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(dashboardData)));
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { level: 2, name: "Faturamento do mês" })).toBeTruthy();
    const drafts = screen.getByRole("link", { name: /Rascunhos.*1/ });
    expect(drafts.getAttribute("href")).toBe("/orcamentos?status=rascunho");
  });
});
