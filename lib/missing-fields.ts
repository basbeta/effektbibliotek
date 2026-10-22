import type { MissingId } from "@/lib/cases";

/**
 * Pure logic for filling in a single missing field from the case page (CR-034).
 * Kept free of React so it can be unit tested.
 */

export type EditableMissingId = Extract<MissingId, "industry" | "channels" | "caseTypes" | "solution" | "effect">;

const EDITABLE: EditableMissingId[] = ["industry", "channels", "caseTypes", "solution", "effect"];

/** True for missing items that map to something the user can fill in here. */
export function isEditableMissing(id: MissingId): id is EditableMissingId {
  return (EDITABLE as MissingId[]).includes(id);
}

export interface MissingDraft {
  industry: string;
  channels: string[];
  caseTypes: string[];
  solution: string;
  resultSummary: string;
}

export function emptyMissingDraft(): MissingDraft {
  return {
    industry: "",
    channels: [],
    caseTypes: [],
    solution: "",
    resultSummary: "",
  };
}

function text(v: string): string {
  return v.trim();
}

/**
 * The PATCH body for saving this draft, or null when there is nothing to save.
 * Only the fields that belong to the missing item are included, so saving never
 * overwrites other parts of the case.
 */
export function buildMissingPatch(id: EditableMissingId, d: MissingDraft): Record<string, unknown> | null {
  switch (id) {
    case "industry":
      return d.industry ? { industry: d.industry } : null;
    case "channels":
      return d.channels.length > 0 ? { channels: d.channels } : null;
    case "caseTypes":
      return d.caseTypes.length > 0 ? { caseTypes: d.caseTypes } : null;
    case "solution":
      return text(d.solution) ? { solution: text(d.solution) } : null;
    case "effect":
      return text(d.resultSummary) ? { resultSummary: text(d.resultSummary) } : null;
  }
}

/** "Lagre" is only enabled when there is something to save. */
export function canSaveMissing(id: EditableMissingId, d: MissingDraft): boolean {
  return buildMissingPatch(id, d) !== null;
}
