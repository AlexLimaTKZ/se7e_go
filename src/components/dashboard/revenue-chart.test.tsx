import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RevenueChart } from "./revenue-chart";

afterEach(cleanup);

describe("RevenueChart", () => {
  it("shows exact values for touch, keyboard and assistive technology", () => {
    render(<RevenueChart data={[
      { name: "Jul", value: 1_250 },
      { name: "Ago", value: 3_500 },
    ]} />);

    expect(screen.getAllByText("R$ 3.500,00").length).toBeGreaterThan(0);
    const julyBar = screen.getByRole("button", { name: /Jul: R\$\s1\.250,00/ });
    fireEvent.focus(julyBar);
    expect(screen.getAllByText("R$ 1.250,00").length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: "Faturamento aprovado por mês" })).toBeTruthy();
  });

  it("renders a useful zero state instead of empty bars", () => {
    render(<RevenueChart data={[
      { name: "Jul", value: 0 },
      { name: "Ago", value: 0 },
    ]} />);

    expect(screen.getByText("Ainda não há faturamento aprovado neste período.")).toBeTruthy();
  });
});
