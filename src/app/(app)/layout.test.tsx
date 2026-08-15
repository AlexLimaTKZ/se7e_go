import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/header", () => ({ Header: () => <header>Cabeçalho</header> }));

import AppLayout from "./layout";

afterEach(cleanup);

describe("AppLayout", () => {
  it("provides a full-size skip link connected to the main content", () => {
    render(<AppLayout><p>Conteúdo</p></AppLayout>);

    const skipLink = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(skipLink.getAttribute("href")).toBe("#conteudo-principal");
    expect(skipLink.className).toContain("min-h-11");
    expect(document.querySelector("main")?.id).toBe("conteudo-principal");
  });
});
