import { describe, it, expect } from "vitest";
import { getMissingInfo, getMissingItems } from "@/lib/cases";

type Fields = Parameters<typeof getMissingInfo>[0];

const complete: Fields = {
  industry: "retail",
  caseTypes: ["automation"],
  channels: ["email"],
  solution: "Løsning",
  resultSummary: "Effekt",
  ndaRestricted: false,
};

const empty: Fields = {
  industry: null,
  caseTypes: [],
  channels: [],
  solution: null,
  resultSummary: null,
  ndaRestricted: false,
};

describe("getMissingInfo", () => {
  it("should report nothing missing for a complete case", () => {
    expect(getMissingInfo(complete)).toEqual({
      forOngoing: [],
      forCompleted: [],
      forPresentation: [],
    });
  });

  it("should list every requirement for a completely empty case", () => {
    expect(getMissingInfo(empty)).toEqual({
      forOngoing: ["Bransje", "Case-type", "Kanal", "Løsning"],
      forCompleted: ["Bransje", "Case-type", "Kanal", "Løsning", "Effekt"],
      forPresentation: [],
    });
  });

  it("should require a solution to set Pågår, and solution plus effect to set Ferdigstilt", () => {
    const noSolution = getMissingInfo({ ...complete, solution: null });
    expect(noSolution.forOngoing).toEqual(["Løsning"]);
    expect(noSolution.forCompleted).toEqual(["Løsning"]);

    const noEffect = getMissingInfo({ ...complete, resultSummary: null });
    expect(noEffect.forOngoing).toEqual([]);
    expect(noEffect.forCompleted).toEqual(["Effekt"]);
  });

  it("should treat empty strings as missing", () => {
    const result = getMissingInfo({ ...complete, industry: "", solution: "", resultSummary: "" });
    expect(result.forOngoing).toEqual(["Bransje", "Løsning"]);
    expect(result.forCompleted).toEqual(["Bransje", "Løsning", "Effekt"]);
  });

  it("should block presentation use when the case is NDA restricted", () => {
    const result = getMissingInfo({ ...complete, ndaRestricted: true });
    expect(result.forPresentation).toEqual(["NDA er satt — kan ikke brukes i presentasjoner"]);
  });

  it("should not have anything for presentations when the case is not NDA restricted", () => {
    expect(getMissingInfo(empty).forPresentation).toEqual([]);
  });
});

describe("getMissingItems (CR-034, CR-035)", () => {
  it("should report nothing for a complete case", () => {
    expect(getMissingItems(complete)).toEqual({ forOngoing: [], forCompleted: [], forPresentation: [] });
  });

  it("should give every missing item a stable id and its label, in form order", () => {
    expect(getMissingItems(empty)).toEqual({
      forOngoing: [
        { id: "industry", label: "Bransje" },
        { id: "caseTypes", label: "Case-type" },
        { id: "channels", label: "Kanal" },
        { id: "solution", label: "Løsning" },
      ],
      forCompleted: [
        { id: "industry", label: "Bransje" },
        { id: "caseTypes", label: "Case-type" },
        { id: "channels", label: "Kanal" },
        { id: "solution", label: "Løsning" },
        { id: "effect", label: "Effekt" },
      ],
      forPresentation: [],
    });
  });

  it("should mark the NDA message with its own id so it can be shown but not edited", () => {
    expect(getMissingItems({ ...complete, ndaRestricted: true }).forPresentation).toEqual([
      { id: "nda", label: "NDA er satt — kan ikke brukes i presentasjoner" },
    ]);
  });

  it("should keep getMissingInfo identical to the labels of getMissingItems", () => {
    for (const c of [empty, complete, { ...complete, ndaRestricted: true }, { ...empty, solution: "s" }]) {
      const items = getMissingItems(c);
      expect(getMissingInfo(c)).toEqual({
        forOngoing: items.forOngoing.map((i) => i.label),
        forCompleted: items.forCompleted.map((i) => i.label),
        forPresentation: items.forPresentation.map((i) => i.label),
      });
    }
  });
});
