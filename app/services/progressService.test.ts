import { describe, it, expect } from "vitest";
import { progressPercent } from "./progressService";

describe("progressPercent", () => {
  it("returns 0 when there are no lessons", () => {
    expect(progressPercent(0, 0)).toBe(0);
  });

  it("returns 0 when nothing is completed", () => {
    expect(progressPercent(0, 5)).toBe(0);
  });

  it("returns 100 when all lessons are completed", () => {
    expect(progressPercent(5, 5)).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(2, 3)).toBe(67);
  });

  it("guards against a zero or negative total", () => {
    expect(progressPercent(3, 0)).toBe(0);
    expect(progressPercent(1, -2)).toBe(0);
  });
});
