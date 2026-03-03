import { describe, expect, it } from "vitest";
import {
  normalizePositiveInteger,
  normalizePositiveIntegerWithin,
  parsePositiveInteger,
} from "./quantity";

describe("quantity utilities", () => {
  it("normalizes positive numbers to step-1 integers", () => {
    expect(normalizePositiveInteger(4.9)).toBe(4);
    expect(normalizePositiveInteger(1)).toBe(1);
    expect(normalizePositiveInteger(0)).toBeNull();
  });

  it("parses string and number values deterministically", () => {
    expect(parsePositiveInteger("7.8")).toBe(7);
    expect(parsePositiveInteger(" 12 ")).toBe(12);
    expect(parsePositiveInteger("abc")).toBeNull();
    expect(parsePositiveInteger(-3)).toBeNull();
  });

  it("clamps parsed quantity within a positive max", () => {
    expect(normalizePositiveIntegerWithin("8", 5)).toBe(5);
    expect(normalizePositiveIntegerWithin("3", 5)).toBe(3);
    expect(normalizePositiveIntegerWithin("0", 5)).toBeNull();
    expect(normalizePositiveIntegerWithin("2", 0)).toBeNull();
  });
});
