import { describe, expect, it } from "vitest";
import {
  formatOpenSourceFlowerCaption,
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
});
