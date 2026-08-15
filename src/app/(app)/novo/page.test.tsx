import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/pdf/quote-preview", () => ({
  QuotePreview: () => null,
}));
vi.mock("@/components/quotes/quote-item-editor", () => ({
  QuoteItemEditor: () => <div>Editor de item</div>,
}));

import QuoteFormPage from "./page";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("QuoteFormPage mobile action bar", () => {
  it("keeps total, PDF and save actions visible while an input is focused", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/quotes/next-number") {
        return Response.json({ nextNumber: "5161" });
      }
      return Response.json([]);
    }));

    render(<QuoteFormPage />);

    const paymentConditions = await screen.findByLabelText("Condições de pagamento");
    const actionBar = screen.getByText("Total").closest<HTMLElement>(".fixed");
    expect(actionBar).toBeTruthy();

    fireEvent.focus(paymentConditions);

    await waitFor(() => {
      expect(actionBar?.className).not.toContain("max-md:translate-y-full");
    });
    expect(screen.getByRole("button", { name: "Visualizar e compartilhar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeTruthy();
  });
});
