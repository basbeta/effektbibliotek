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
  it.each<MissingId>(["industry", "channels", "caseTypes", "problem", "solution", "effectOrLearning", "customerFacingSummary"])(
    "should treat %s as editable",
    (id) => {
      expect(isEditableMissing(id)).toBe(true);
    }
  );

  it.each<MissingId>(["nda", "problemOrSolution"])("should not treat %s as editable", (id) => {
    expect(isEditableMissing(id)).toBe(false);
  });
});

describe("buildMissingPatch", () => {
  it("should return null for every item when the draft is empty", () => {
    const ids: EditableMissingId[] = [
      "industry",
      "channels",
      "caseTypes",
      "problem",
      "solution",
      "effectOrLearning",
      "customerFacingSummary",
    ];
    for (const id of ids) expect(buildMissingPatch(id, draft())).toBeNull();
  });

  it("should send only the industry for the industry item", () => {
    expect(buildMissingPatch("industry", { ...draft(), industry: "retail", problem: "ikke med" })).toEqual({
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
    expect(buildMissingPatch("problem", { ...draft(), problem: "  Problem  ", solution: "ikke med" })).toEqual({
      problem: "Problem",
    });
    expect(buildMissingPatch("solution", { ...draft(), solution: "\nLøsning\t" })).toEqual({ solution: "Løsning" });
    expect(buildMissingPatch("customerFacingSummary", { ...draft(), customerFacingSummary: " Kunde " })).toEqual({
      customerFacingSummary: "Kunde",
    });
  });

  it("should treat whitespace-only text as empty", () => {
    expect(buildMissingPatch("problem", { ...draft(), problem: "   \n " })).toBeNull();
  });

  describe("effekt eller læring", () => {
    it("should send both parts when both are filled in", () => {
      expect(buildMissingPatch("effectOrLearning", { ...draft(), resultSummary: "E", learning: "L" })).toEqual({
        resultSummary: "E",
        learning: "L",
      });
    });

    it("should send only the part that was filled in, so the other is not overwritten", () => {
      expect(buildMissingPatch("effectOrLearning", { ...draft(), resultSummary: "E" })).toEqual({
        resultSummary: "E",
      });
      expect(buildMissingPatch("effectOrLearning", { ...draft(), learning: "L" })).toEqual({ learning: "L" });
    });

    it("should return null when neither part has text", () => {
      expect(buildMissingPatch("effectOrLearning", { ...draft(), resultSummary: " ", learning: "" })).toBeNull();
    });
  });
});

describe("canSaveMissing", () => {
  it("should be false until something is filled in", () => {
    expect(canSaveMissing("problem", draft())).toBe(false);
    expect(canSaveMissing("channels", draft())).toBe(false);
  });

  it("should be true once there is something to save", () => {
    expect(canSaveMissing("problem", { ...draft(), problem: "x" })).toBe(true);
    expect(canSaveMissing("channels", { ...draft(), channels: ["sms"] })).toBe(true);
    expect(canSaveMissing("effectOrLearning", { ...draft(), learning: "x" })).toBe(true);
  });
});
