import { describe, expect, it } from "vitest";
import {
  MAX_LOGIN_PASSWORD_LENGTH,
  parseLoginInput,
  resolveLoginRedirect,
} from "./login-input";

describe("resolveLoginRedirect", () => {
  it("preserves a safe internal destination", () => {
    expect(resolveLoginRedirect("/orcamentos?status=aberto#lista"))
      .toBe("/orcamentos?status=aberto#lista");
  });

  it.each([
    undefined,
    ["/orcamentos"],
    "https://example.com/roubo",
    "//example.com/roubo",
    "javascript:alert(1)",
    "\\example.com\\roubo",
    "/%5c%5cexample.com/roubo",
    "/login",
  ])("falls back to the dashboard for an unsafe destination: %j", (value) => {
    expect(resolveLoginRedirect(value)).toBe("/");
  });
});

describe("parseLoginInput", () => {
  it("accepts a non-empty password without changing whitespace", () => {
    expect(parseLoginInput({ password: " senha com espaço " })).toEqual({
      ok: true,
      password: " senha com espaço ",
    });
  });

  it.each([
    null,
    {},
    { password: "" },
    { password: 1234 },
    { password: ["segredo"] },
    { password: "x".repeat(MAX_LOGIN_PASSWORD_LENGTH + 1) },
  ])("rejects an invalid login payload: %j", (value) => {
    expect(parseLoginInput(value).ok).toBe(false);
  });
});
