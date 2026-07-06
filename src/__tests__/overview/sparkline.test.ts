import { describe, it, expect } from "vitest";
import { buildSparklinePath } from "@/components/overview/Sparkline";

describe("buildSparklinePath", () => {
  it("returns an empty string for no values", () => {
    expect(buildSparklinePath([], 120, 32)).toBe("");
  });

  it("draws a flat baseline for all-zero values", () => {
    const path = buildSparklinePath([0, 0, 0], 120, 32, 2);
    // All y coordinates should be at the bottom (height - pad = 30)
    const ys = path.match(/,([\d.]+)/g)!.map((m) => parseFloat(m.slice(1)));
    expect(ys.every((y) => y === 30)).toBe(true);
  });

  it("maps the max value to the top and spans the full width", () => {
    const path = buildSparklinePath([0, 10], 100, 40, 2);
    const points = path.split(" ");
    expect(points[0]).toBe("M0.0,38.0"); // zero → bottom pad
    expect(points[1]).toBe("L100.0,2.0"); // max → top pad
  });

  it("produces one segment per value", () => {
    const path = buildSparklinePath([1, 2, 3, 4, 5], 120, 32);
    expect(path.startsWith("M")).toBe(true);
    expect(path.match(/L/g)).toHaveLength(4);
  });
});
