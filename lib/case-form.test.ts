import { describe, it, expect } from "vitest";
import {
  getSectionProgress,
  firstIncompleteSection,
  getBlocksWithContent,
  hasExtraEffectDetails,
  getSectionSummary,
  getBlockSummary,
  filterOptions,
  OPTIONAL_BLOCKS,
  type CaseFormValues,
} from "@/lib/case-form";
import { channelLabels } from "@/lib/labels";

const empty: CaseFormValues = {
  customerName: "",
  title: "",
  summary: "",
  industry: "",
  channels: [],
  caseTypes: [],
  solution: "",
  resultSummary: "",
  relevance: "",
  effectTypes: [],
  effectMetric: "",
  beforeValue: "",
  afterValue: "",
  resultValue: "",
  measurementPeriod: "",
  dataSource: "",
  evidenceLevel: "",
  internalNotes: "",
};

const complete: CaseFormValues = {
  ...empty,
  customerName: "Testkunde AS",
  title: "Testcase",
  summary: "Beskrivelse",
  industry: "retail",
  channels: ["sms"],
  caseTypes: ["automation"],
  solution: "L",
  resultSummary: "E",
};

describe("getSectionProgress", () => {
  it("should report nothing done for an empty form", () => {
    const p = getSectionProgress(empty);
    expect(p.basics).toEqual({ done: 0, total: 3, complete: false });
    expect(p.classification).toEqual({ done: 0, total: 3, complete: false });
    expect(p.content).toEqual({ done: 0, total: 2, complete: false });
  });

  it("should report every section complete for a complete case", () => {
    const p = getSectionProgress(complete);
    expect(p.basics.complete && p.classification.complete && p.content.complete).toBe(true);
  });

  it("should count whitespace-only text as empty", () => {
    const p = getSectionProgress({ ...complete, title: "   ", solution: "\n\t" });
    expect(p.basics.done).toBe(2);
    expect(p.content.done).toBe(1);
  });

  it("should count each classification part separately", () => {
    expect(getSectionProgress({ ...empty, industry: "retail" }).classification.done).toBe(1);
    expect(getSectionProgress({ ...empty, channels: ["sms", "email"] }).classification.done).toBe(1);
    expect(getSectionProgress({ ...empty, caseTypes: ["winback"] }).classification.done).toBe(1);
  });

  it("should need both a solution and an effect for the content section to be complete", () => {
    expect(getSectionProgress({ ...complete, solution: "", resultSummary: "" }).content).toEqual({
      done: 0,
      total: 2,
      complete: false,
    });
    expect(getSectionProgress({ ...complete, resultSummary: "" }).content).toEqual({
      done: 1,
      total: 2,
      complete: false,
    });
    expect(getSectionProgress({ ...complete, solution: "" }).content).toEqual({
      done: 1,
      total: 2,
      complete: false,
    });
    expect(getSectionProgress(complete).content.complete).toBe(true);
  });
});

describe("firstIncompleteSection", () => {
  it("should return the first section in form order that is not complete", () => {
    expect(firstIncompleteSection(getSectionProgress(empty))).toBe("basics");
    expect(
      firstIncompleteSection(getSectionProgress({ ...complete, industry: "" }))
    ).toBe("classification");
    expect(
      firstIncompleteSection(getSectionProgress({ ...complete, solution: "" }))
    ).toBe("content");
  });

  it("should return null when everything is complete", () => {
    expect(firstIncompleteSection(getSectionProgress(complete))).toBeNull();
  });
});

describe("getBlocksWithContent", () => {
  it("should show no optional blocks for a case without optional data", () => {
    expect(getBlocksWithContent(complete)).toEqual([]);
  });

  it.each([
    ["relevance", { relevance: "Relevant" }],
    ["internalNotes", { internalNotes: "Notat" }],
    ["effect", { effectMetric: "Konvertering" }],
    ["effect", { resultValue: "+12 %" }],
    ["effect", { evidenceLevel: "documented" }],
    ["effect", { effectTypes: ["increased_sales"] }],
    ["effect", { beforeValue: "1" }],
    ["effect", { afterValue: "2" }],
    ["effect", { measurementPeriod: "Q3" }],
    ["effect", { dataSource: "Dashboard" }],
  ])("should show the %s block when its data is filled (%j)", (key, patch) => {
    expect(getBlocksWithContent({ ...complete, ...patch })).toEqual([key]);
  });

  it("should not show a block for whitespace-only text", () => {
    expect(getBlocksWithContent({ ...complete, relevance: "   ", internalNotes: "\n" })).toEqual([]);
  });

  it("should return blocks in the fixed form order", () => {
    const all = getBlocksWithContent({
      ...complete,
      internalNotes: "n",
      relevance: "r",
      effectMetric: "m",
    });
    expect(all).toEqual(OPTIONAL_BLOCKS.map((b) => b.key));
  });
});

describe("hasExtraEffectDetails", () => {
  it("should be false when only the main measurement fields are filled", () => {
    expect(
      hasExtraEffectDetails({ ...empty, effectMetric: "m", resultValue: "r", evidenceLevel: "documented" })
    ).toBe(false);
  });

  it("should be true when any extra detail is filled", () => {
    expect(hasExtraEffectDetails({ ...empty, dataSource: "x" })).toBe(true);
  });
});

describe("getSectionSummary", () => {
  it("should combine customer and title for basics", () => {
    expect(getSectionSummary("basics", complete)).toBe("Testkunde AS — Testcase");
  });

  it("should show only the filled part of basics", () => {
    expect(getSectionSummary("basics", { ...empty, title: "Bare tittel" })).toBe("Bare tittel");
    expect(getSectionSummary("basics", empty)).toBe("");
  });

  it("should list industry, channels and case types as labels", () => {
    expect(
      getSectionSummary("classification", {
        ...complete,
        channels: ["sms", "email"],
        caseTypes: ["automation"],
      })
    ).toBe("Retail · SMS · E-post · Automatisering");
  });

  it("should be empty for an empty classification", () => {
    expect(getSectionSummary("classification", empty)).toBe("");
  });

  it("should name the content parts that are filled in", () => {
    expect(getSectionSummary("content", { ...empty, solution: "s", resultSummary: "e" })).toBe(
      "Løsning · Effekt"
    );
  });
});

describe("getBlockSummary", () => {
  it("should summarise effect as metric and result", () => {
    expect(getBlockSummary("effect", { ...empty, effectMetric: "Konvertering", resultValue: "+12 %" })).toBe(
      "Konvertering: +12 %"
    );
  });

  it("should fall back to effect type labels when nothing was measured", () => {
    expect(getBlockSummary("effect", { ...empty, effectTypes: ["increased_sales", "time_saved"] })).toBe(
      "Økt salg · Tidsbesparelse"
    );
  });

  it("should shorten long texts to an excerpt with an ellipsis", () => {
    const long = "a".repeat(200);
    const summary = getBlockSummary("relevance", { ...empty, relevance: long });
    expect(summary).toHaveLength(80);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("should collapse whitespace and newlines in excerpts", () => {
    expect(getBlockSummary("internalNotes", { ...empty, internalNotes: "linje 1\n\n  linje 2" })).toBe(
      "linje 1 linje 2"
    );
  });
});

describe("filterOptions", () => {
  const options = channelLabels;

  it("should return every option when the query is empty", () => {
    expect(filterOptions(options, [], "")).toHaveLength(Object.keys(options).length);
    expect(filterOptions(options, [], "   ")).toHaveLength(Object.keys(options).length);
  });

  it("should exclude options that are already selected", () => {
    const result = filterOptions(options, ["sms", "email"], "");
    expect(result.map(([v]) => v)).not.toContain("sms");
    expect(result.map(([v]) => v)).not.toContain("email");
  });

  it("should match case-insensitively on the label", () => {
    expect(filterOptions(options, [], "sMs").map(([v]) => v)).toEqual(["sms"]);
  });

  it("should put labels that start with the query before labels that contain it", () => {
    const result = filterOptions({ a: "Landingsside", b: "Paid media", c: "Digipost" }, [], "d");
    // "Digipost" starts with d; "Landingsside" and "Paid media" only contain d
    expect(result.map(([v]) => v)).toEqual(["c", "a", "b"]);
  });

  it("should return an empty list when nothing matches", () => {
    expect(filterOptions(options, [], "finnes ikke")).toEqual([]);
  });

  it("should handle Norwegian letters", () => {
    expect(filterOptions({ x: "Økt salg", y: "Annet" }, [], "øk").map(([v]) => v)).toEqual(["x"]);
  });
});
