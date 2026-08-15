import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => navigation,
}));
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button" aria-label="Alternar tema" />,
}));

import { Header } from "./header";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Header", () => {
  it("uses direct navigation links instead of invalid nested controls", () => {
    const { container } = render(<Header />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Orçamentos" })).toBeTruthy();
    expect(container.querySelector("a button")).toBeNull();
  });

  it("gives the icon-only logout action an accessible name", () => {
    render(<Header />);

    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });
});
