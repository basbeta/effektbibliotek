import { describe, it, expect } from "vitest";
import { getMissingInfo } from "@/lib/cases";

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
