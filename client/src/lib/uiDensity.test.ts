import {
  UI_DENSITY_STORAGE_KEY,
  initializeUiDensity,
  readUiDensity,
  writeUiDensity,
} from "@/lib/uiDensity";

describe("uiDensity", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-view-density");
  });

  it("defaults to comfortable when nothing is stored", () => {
    expect(readUiDensity()).toBe("comfortable");
  });

  it("initializes data attribute from storage", () => {
    localStorage.setItem(UI_DENSITY_STORAGE_KEY, "compact");

    const density = initializeUiDensity();

    expect(density).toBe("compact");
    expect(document.documentElement.getAttribute("data-view-density")).toBe(
      "compact"
    );
  });

  it("writes and applies compact density", () => {
    writeUiDensity("compact");

    expect(localStorage.getItem(UI_DENSITY_STORAGE_KEY)).toBe("compact");
    expect(document.documentElement.getAttribute("data-view-density")).toBe(
      "compact"
    );
  });

  it("falls back to comfortable for invalid values", () => {
    localStorage.setItem(UI_DENSITY_STORAGE_KEY, "dense");

    expect(readUiDensity()).toBe("comfortable");
  });
});
