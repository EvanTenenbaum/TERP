import { describe, expect, it } from "vitest";

import {
  resolveNextSelectedDraftId,
  resolveSelectedDraft,
} from "./productIntakeSelection";

const drafts = [{ id: "draft-1" }, { id: "draft-2" }];

describe("resolveNextSelectedDraftId", () => {
  it("keeps the requested draft when it exists", () => {
    expect(
      resolveNextSelectedDraftId({
        drafts,
        requestedDraftId: "draft-2",
        currentSelectedDraftId: "draft-1",
      })
    ).toBe("draft-2");
  });

  it("does not fall back to a different draft when the requested draft is missing", () => {
    expect(
      resolveNextSelectedDraftId({
        drafts,
        requestedDraftId: "missing-draft",
        currentSelectedDraftId: "draft-1",
      })
    ).toBeNull();
  });

  it("clears stale selection when no draft is explicitly requested", () => {
    expect(
      resolveNextSelectedDraftId({
        drafts,
        currentSelectedDraftId: null,
      })
    ).toBeNull();
  });
});

describe("resolveSelectedDraft", () => {
  it("returns the current draft from the latest drafts list", () => {
    expect(resolveSelectedDraft(drafts, "draft-2")).toEqual({ id: "draft-2" });
  });

  it("clears the selection when the chosen draft disappears from the refreshed list", () => {
    expect(resolveSelectedDraft([{ id: "draft-1" }], "draft-2")).toBeNull();
  });
});
