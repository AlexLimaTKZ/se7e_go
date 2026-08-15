import { describe, expect, it } from "vitest";
import { viewport } from "./layout";

describe("root mobile viewport", () => {
  it("resizes the page content so fixed actions stay above the Android keyboard", () => {
    expect(viewport.interactiveWidget).toBe("resizes-content");
  });
});
