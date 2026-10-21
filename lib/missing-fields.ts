import type { MissingId } from "@/lib/cases";

/**
 * Pure logic for filling in a single missing field from the case page (CR-034).
 * Kept free of React so it can be unit tested.
 */

export type EditableMissingId = Extract<
  MissingId,
  "industry" | "channels" | "caseTypes" | "problem" | "solution" | "effectOrLearning" | "customerFacingSummary"
>;

const EDITABLE: EditableMissingId[] = [
  "industry",
  "channels",
  "caseTypes",
  "problem",
  "solution",
  "effectOrLearning",
  "customerFacingSummary",
];

/** True for missing items that map to something the user can fill in here. */
export function isEditableMissing(id: MissingId): id is EditableMissingId {
  return (EDITABLE as MissingId[]).includes(id);
}

export interface MissingDraft {
  industry: string;
  channels: string[];
  caseTypes: string[];
  problem: string;
  solution: string;
  resultSummary: string;
  learning: string;
  customerFacingSummary: string;
}

export function emptyMissingDraft(): MissingDraft {
  return {
    industry: "",
    channels: [],
    caseTypes: [],
    problem: "",
    solution: "",
    resultSummary: "",
    learning: "",
    customerFacingSummary: "",
  };
}

function text(v: string): string {
  return v.trim();
}

/**
 * The PATCH body for saving this draft, or null when there is nothing to save.
 * Only the fields that belong to the missing item are included, so saving never
 * overwrites other parts of the case. For "effekt eller læring" only the parts
 * that were filled in are sent.
 */
export function buildMissingPatch(id: EditableMissingId, d: MissingDraft): Record<string, unknown> | null {
  switch (id) {
    case "industry":
      return d.industry ? { industry: d.industry } : null;
    case "channels":
      return d.channels.length > 0 ? { channels: d.channels } : null;
    case "caseTypes":
      return d.caseTypes.length > 0 ? { caseTypes: d.caseTypes } : null;
    case "problem":
      return text(d.problem) ? { problem: text(d.problem) } : null;
    case "solution":
      return text(d.solution) ? { solution: text(d.solution) } : null;
    case "customerFacingSummary":
      return text(d.customerFacingSummary) ? { customerFacingSummary: text(d.customerFacingSummary) } : null;
    case "effectOrLearning": {
      const patch: Record<string, unknown> = {};
      if (text(d.resultSummary)) patch.resultSummary = text(d.resultSummary);
      if (text(d.learning)) patch.learning = text(d.learning);
      return Object.keys(patch).length > 0 ? patch : null;
    }
  }
}

/** "Lagre" is only enabled when there is something to save. */
export function canSaveMissing(id: EditableMissingId, d: MissingDraft): boolean {
  return buildMissingPatch(id, d) !== null;
}
