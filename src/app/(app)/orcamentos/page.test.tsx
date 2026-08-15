import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams("status=aprovado"),
}));
vi.mock("@/components/pdf/quote-preview", () => ({
  QuotePreview: () => null,
}));

import QuotesListPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("QuotesListPage status filter", () => {
  it("reads the dashboard status, marks it active and sends it to the API", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => {
      void _input;
      return Response.json({ items: [], total: 0, totalPages: 1 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<QuotesListPage />);

    const approved = await screen.findByRole("link", { name: "Aprovados" });
    expect(approved.getAttribute("aria-current")).toBe("page");
    await waitFor(() => {
      expect(String(fetchMock.mock.calls[0][0])).toContain("status=aprovado");
    });
  });
});
