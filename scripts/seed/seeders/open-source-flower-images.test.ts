import { describe, expect, it } from "vitest";
import {
  formatOpenSourceFlowerCaption,
  isOpenSourceFlowerFallbackEnabled,
  pickOpenSourceFlowerImage,
} from "./open-source-flower-images";

describe("open-source-flower-images", () => {
  it("returns deterministic image selection for the same seed", () => {
    const first = pickOpenSourceFlowerImage(42);
    const second = pickOpenSourceFlowerImage(42);

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first?.url).toBe(second?.url);
  });

  it("formats attribution caption with source and license context", () => {
    const image = pickOpenSourceFlowerImage(7);
    expect(image).toBeTruthy();
    if (!image) {
      throw new Error("Expected open-source flower image to be available");
    }

    const caption = formatOpenSourceFlowerCaption(image);
    expect(caption).toContain("Wikimedia Commons");
    expect(caption).toContain(image.license);
    expect(caption).toContain(image.author);
  });

  it("enables open-source fallback by default", () => {
    expect(isOpenSourceFlowerFallbackEnabled(undefined)).toBe(true);
  });

  it("disables open-source fallback for false-like env values", () => {
    expect(isOpenSourceFlowerFallbackEnabled("false")).toBe(false);
    expect(isOpenSourceFlowerFallbackEnabled("0")).toBe(false);
    expect(isOpenSourceFlowerFallbackEnabled("off")).toBe(false);
    expect(isOpenSourceFlowerFallbackEnabled("no")).toBe(false);
  });

  it("treats true-like values as enabled", () => {
    expect(isOpenSourceFlowerFallbackEnabled("true")).toBe(true);
    expect(isOpenSourceFlowerFallbackEnabled("1")).toBe(true);
    expect(isOpenSourceFlowerFallbackEnabled("yes")).toBe(true);
  });
});
