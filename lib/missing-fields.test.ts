import { describe, it, expect } from "vitest";
import {
  buildMissingPatch,
  canSaveMissing,
  emptyMissingDraft,
  isEditableMissing,
  type EditableMissingId,
} from "@/lib/missing-fields";
import type { MissingId } from "@/lib/cases";

const draft = emptyMissingDraft;

describe("isEditableMissing", () => {
  it.each<MissingId>(["industry", "channels", "caseTypes", "solution", "effect"])(
    "should treat %s as editable",
    (id) => {
      expect(isEditableMissing(id)).toBe(true);
    }
  );

  it("should not treat the NDA message as editable", () => {
    expect(isEditableMissing("nda")).toBe(false);
  });
});

describe("buildMissingPatch", () => {
  it("should return null for every item when the draft is empty", () => {
    const ids: EditableMissingId[] = ["industry", "channels", "caseTypes", "solution", "effect"];
    for (const id of ids) expect(buildMissingPatch(id, draft())).toBeNull();
  });

  it("should send only the industry for the industry item", () => {
    expect(buildMissingPatch("industry", { ...draft(), industry: "retail", solution: "ikke med" })).toEqual({
      industry: "retail",
    });
  });

  it("should send channels and case types as lists", () => {
    expect(buildMissingPatch("channels", { ...draft(), channels: ["sms", "email"] })).toEqual({
      channels: ["sms", "email"],
    });
    expect(buildMissingPatch("caseTypes", { ...draft(), caseTypes: ["automation"] })).toEqual({
      caseTypes: ["automation"],
    });
  });

  it("should trim text and send only the field that belongs to the item", () => {
    expect(buildMissingPatch("solution", { ...draft(), solution: "  Løsning \n", resultSummary: "ikke med" })).toEqual({
      solution: "Løsning",
    });
  });

  it("should save the effect item as resultSummary, and nothing else", () => {
    expect(buildMissingPatch("effect", { ...draft(), resultSummary: "\tEffekt  ", solution: "ikke med" })).toEqual({
      resultSummary: "Effekt",
    });
  });

  it("should treat whitespace-only text as empty", () => {
    expect(buildMissingPatch("solution", { ...draft(), solution: "   \n " })).toBeNull();
    expect(buildMissingPatch("effect", { ...draft(), resultSummary: " " })).toBeNull();
  });
});

describe("canSaveMissing", () => {
  it("should be false until something is filled in", () => {
    expect(canSaveMissing("solution", draft())).toBe(false);
    expect(canSaveMissing("channels", draft())).toBe(false);
    expect(canSaveMissing("effect", draft())).toBe(false);
  });

  it("should be true once there is something to save", () => {
    expect(canSaveMissing("solution", { ...draft(), solution: "x" })).toBe(true);
    expect(canSaveMissing("channels", { ...draft(), channels: ["sms"] })).toBe(true);
    expect(canSaveMissing("effect", { ...draft(), resultSummary: "x" })).toBe(true);
  });
});
