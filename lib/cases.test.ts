import { describe, it, expect } from "vitest";
import { getMissingInfo, getMissingItems } from "@/lib/cases";

type Fields = Parameters<typeof getMissingInfo>[0];

const complete: Fields = {
  industry: "retail",
  caseTypes: ["automation"],
  channels: ["email"],
  problem: "Problem",
  solution: "Løsning",
  resultSummary: "Effekt",
  learning: "Læring",
  customerFacingSummary: "Kundevennlig",
  ndaRestricted: false,
};

const empty: Fields = {
  industry: null,
  caseTypes: [],
  channels: [],
  problem: null,
  solution: null,
  resultSummary: null,
  learning: null,
  customerFacingSummary: null,
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
      forOngoing: ["Bransje", "Case-type", "Kanal", "Problem eller løsning"],
      forCompleted: [
        "Bransje",
        "Case-type",
        "Kanal",
        "Problem / kontekst",
        "Løsning",
        "Effekt eller læring",
      ],
      forPresentation: ["Kundevennlig beskrivelse"],
    });
  });

  it("should accept problem alone for an ongoing case but still require a solution to complete", () => {
    const result = getMissingInfo({ ...complete, solution: null });
    expect(result.forOngoing).toEqual([]);
    expect(result.forCompleted).toEqual(["Løsning"]);
  });

  it("should accept solution alone for an ongoing case but still require a problem to complete", () => {
    const result = getMissingInfo({ ...complete, problem: null });
    expect(result.forOngoing).toEqual([]);
    expect(result.forCompleted).toEqual(["Problem / kontekst"]);
  });

  it("should accept either result summary or learning as effect or learning", () => {
    expect(getMissingInfo({ ...complete, learning: null }).forCompleted).toEqual([]);
    expect(getMissingInfo({ ...complete, resultSummary: null }).forCompleted).toEqual([]);
    expect(
      getMissingInfo({ ...complete, resultSummary: null, learning: null }).forCompleted
    ).toEqual(["Effekt eller læring"]);
  });

  it("should treat empty strings as missing", () => {
    const result = getMissingInfo({ ...complete, industry: "", problem: "", customerFacingSummary: "" });
    expect(result.forOngoing).toContain("Bransje");
    expect(result.forCompleted).toContain("Problem / kontekst");
    expect(result.forPresentation).toContain("Kundevennlig beskrivelse");
  });

  it("should block presentation use when the case is NDA restricted", () => {
    const result = getMissingInfo({ ...complete, ndaRestricted: true });
    expect(result.forPresentation).toEqual(["NDA er satt — kan ikke brukes i presentasjoner"]);
  });
});

describe("getMissingItems (CR-034)", () => {
  it("should report nothing for a complete case", () => {
    expect(getMissingItems(complete)).toEqual({ forOngoing: [], forCompleted: [], forPresentation: [] });
  });

  it("should give every missing item a stable id and its label, in form order", () => {
    expect(getMissingItems(empty)).toEqual({
      forOngoing: [
        { id: "industry", label: "Bransje" },
        { id: "caseTypes", label: "Case-type" },
        { id: "channels", label: "Kanal" },
        { id: "problemOrSolution", label: "Problem eller løsning" },
      ],
      forCompleted: [
        { id: "industry", label: "Bransje" },
        { id: "caseTypes", label: "Case-type" },
        { id: "channels", label: "Kanal" },
        { id: "problem", label: "Problem / kontekst" },
        { id: "solution", label: "Løsning" },
        { id: "effectOrLearning", label: "Effekt eller læring" },
      ],
      forPresentation: [{ id: "customerFacingSummary", label: "Kundevennlig beskrivelse" }],
    });
  });

  it("should mark the NDA message with its own id so it can be shown but not edited", () => {
    expect(getMissingItems({ ...complete, ndaRestricted: true }).forPresentation).toEqual([
      { id: "nda", label: "NDA er satt — kan ikke brukes i presentasjoner" },
    ]);
  });

  it("should keep getMissingInfo identical to the labels of getMissingItems", () => {
    for (const c of [empty, complete, { ...complete, ndaRestricted: true }, { ...empty, problem: "p" }]) {
      const items = getMissingItems(c);
      expect(getMissingInfo(c)).toEqual({
        forOngoing: items.forOngoing.map((i) => i.label),
        forCompleted: items.forCompleted.map((i) => i.label),
        forPresentation: items.forPresentation.map((i) => i.label),
      });
    }
  });
});