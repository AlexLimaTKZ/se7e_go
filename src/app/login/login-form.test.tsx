import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const navigation = vi.hoisted(() => ({
  prefetch: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("provides a decorative technical grid for mobile without covering interactions", () => {
    const { container } = render(<LoginForm redirectTo="/" />);

    const ambient = container.querySelector<HTMLElement>("[data-mobile-login-ambient]");
    expect(ambient).toBeTruthy();
    expect(ambient?.getAttribute("aria-hidden")).toBe("true");
    expect(ambient?.className).toContain("pointer-events-none");
    expect(ambient?.className).toContain("lg:hidden");
    expect(ambient?.querySelector("[data-mobile-grid]")).toBeTruthy();
    expect(ambient?.querySelector("[data-mobile-grid-glow]")).toBeTruthy();
  });

  it("provides a decorative ambient scene only in the desktop panel", () => {
    const { container } = render(<LoginForm redirectTo="/" />);

    const panel = container.querySelector<HTMLElement>("[data-login-ambient]");
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    expect(panel?.className).toContain("hidden");
    expect(panel?.className).toContain("lg:flex");
    expect(panel?.querySelector("[data-ambient-beam]")).toBeTruthy();
    const brand = panel?.querySelector<HTMLElement>("[data-ambient-brand]");
    expect(brand).toBeTruthy();
    expect(brand?.style.webkitTextStroke).toBe("");
    expect(panel?.querySelector("[data-ambient-tagline]")).toBeTruthy();
    expect(panel?.querySelector("[data-ambient-security-pulse]")).toBeTruthy();
  });

  it("uses mobile-friendly password semantics without opening the keyboard", () => {
    render(<LoginForm redirectTo="/" />);

    const input = screen.getByLabelText("Senha de acesso");
    expect(input.getAttribute("type")).toBe("password");
    expect(input.getAttribute("autocomplete")).toBe("current-password");
    expect(input.getAttribute("autocapitalize")).toBe("none");
    expect(input.hasAttribute("autofocus")).toBe(false);
  });

  it("lets the user show and hide the password accessibly", () => {
    render(<LoginForm redirectTo="/" />);

    const input = screen.getByLabelText("Senha de acesso");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input.getAttribute("type")).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar senha" }).getAttribute("aria-pressed"))
      .toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(input.getAttribute("type")).toBe("password");
  });

  it("announces authentication errors and connects them to the input", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      { status: 429 },
    )));
    render(<LoginForm redirectTo="/" />);

    const input = screen.getByLabelText("Senha de acesso");
    fireEvent.change(input, { target: { value: "incorreta" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no sistema" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Muitas tentativas");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("password-error");
  });

  it("returns to the sanitized protected destination after login", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
    render(<LoginForm redirectTo="/orcamentos?status=aberto" />);

    fireEvent.change(screen.getByLabelText("Senha de acesso"), {
      target: { value: "correta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no sistema" }));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/orcamentos?status=aberto");
      expect(navigation.refresh).toHaveBeenCalledOnce();
    });
    expect(navigation.prefetch).toHaveBeenCalledWith("/orcamentos?status=aberto");
  });
});
