import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AuthCookie = { value: string } | undefined;
type CookieStore = { get: (name: string) => AuthCookie };

const auth = vi.hoisted(() => ({
  verifyToken: vi.fn(async () => true),
}));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
const headers = vi.hoisted(() => ({
  cookies: vi.fn<() => Promise<CookieStore>>(async () => ({
    get: () => ({ value: "valid-token" }),
  })),
}));

vi.mock("@/components/layout/header", () => ({ Header: () => <header>Cabeçalho</header> }));
vi.mock("@/lib/auth", () => auth);
vi.mock("next/navigation", () => navigation);
vi.mock("next/headers", () => headers);

import AppLayout from "./layout";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyToken.mockResolvedValue(true);
  headers.cookies.mockResolvedValue({
    get: () => ({ value: "valid-token" }),
  });
});

describe("AppLayout", () => {
  it("redirects to login when the auth cookie is missing", async () => {
    headers.cookies.mockResolvedValue({
      get: () => undefined,
    });

    await expect(AppLayout({ children: <p>Conteúdo</p> })).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(auth.verifyToken).not.toHaveBeenCalled();
  });

  it("redirects to login when the auth token is invalid", async () => {
    auth.verifyToken.mockResolvedValue(false);

    await expect(AppLayout({ children: <p>Conteúdo</p> })).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(auth.verifyToken).toHaveBeenCalledWith("valid-token");
  });

  it("renders protected content when the auth token is valid", async () => {
    render(await AppLayout({ children: <p>Conteúdo</p> }));

    const skipLink = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(skipLink.getAttribute("href")).toBe("#conteudo-principal");
    expect(skipLink.className).toContain("min-h-11");
    expect(document.querySelector("main")?.id).toBe("conteudo-principal");
    expect(screen.getByText("Conteúdo")).toBeTruthy();
  });
});
