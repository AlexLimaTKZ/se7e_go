import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const notifications = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: notifications }));

import { QuickNotes } from "./quick-notes";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("QuickNotes", () => {
  it("associates a visible label with the note field", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([])));
    render(<QuickNotes />);

    expect(await screen.findByLabelText("Nova anotação")).toBeTruthy();
  });

  it("reports loading failures instead of failing silently", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, { status: 500 })));
    render(<QuickNotes />);

    await waitFor(() => {
      expect(notifications.error).toHaveBeenCalledWith("Não foi possível carregar as anotações.");
    });
  });

  it("shows the note time and offers undo after deletion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json([{ id: 7, content: "Ligar para o cliente", createdAt: "2026-08-14T18:30:00.000Z" }]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ id: 8, content: "Ligar para o cliente", createdAt: "2026-08-14T18:31:00.000Z" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<QuickNotes />);

    expect(await screen.findByText(/14\/08.*15:30/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Excluir anotação: Ligar para o cliente" }));

    await waitFor(() => expect(notifications.success).toHaveBeenCalledOnce());
    const options = notifications.success.mock.calls[0][1] as {
      action: { label: string; onClick: () => void };
    };
    expect(options.action.label).toBe("Desfazer");
    options.action.onClick();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "POST" });
  });
});
