export interface MissingInfo {
  forOngoing: string[];
  forCompleted: string[];
  forPresentation: string[];
}

/**
 * Stable ids for the things that can be missing, so the UI can offer the right
 * editor for each one (CR-034). "problemOrSolution" and "nda" are not single
 * editable fields.
 */
export type MissingId =
  | "industry"
  | "caseTypes"
  | "channels"
  | "problemOrSolution"
  | "problem"
  | "solution"
  | "effectOrLearning"
  | "customerFacingSummary"
  | "nda";

export interface MissingItem {
  id: MissingId;
  label: string;
}

export interface MissingItems {
  forOngoing: MissingItem[];
  forCompleted: MissingItem[];
  forPresentation: MissingItem[];
}

interface CaseFields {
  industry: string | null;
  caseTypes: string[];
  channels: string[];
  problem: string | null;
  solution: string | null;
  resultSummary: string | null;
  learning: string | null;
  customerFacingSummary: string | null;
  ndaRestricted: boolean;
}

export function getMissingItems(c: CaseFields): MissingItems {
  const forOngoing: MissingItem[] = [];
  const forCompleted: MissingItem[] = [];
  const forPresentation: MissingItem[] = [];

  if (!c.industry) {
    forOngoing.push({ id: "industry", label: "Bransje" });
    forCompleted.push({ id: "industry", label: "Bransje" });
  }
  if (!c.caseTypes?.length) {
    forOngoing.push({ id: "caseTypes", label: "Case-type" });
    forCompleted.push({ id: "caseTypes", label: "Case-type" });
  }
  if (!c.channels?.length) {
    forOngoing.push({ id: "channels", label: "Kanal" });
    forCompleted.push({ id: "channels", label: "Kanal" });
  }
  if (!c.problem && !c.solution) {
    forOngoing.push({ id: "problemOrSolution", label: "Problem eller løsning" });
  }
  if (!c.problem) forCompleted.push({ id: "problem", label: "Problem / kontekst" });
  if (!c.solution) forCompleted.push({ id: "solution", label: "Løsning" });
  if (!c.resultSummary && !c.learning) {
    forCompleted.push({ id: "effectOrLearning", label: "Effekt eller læring" });
  }

  if (!c.customerFacingSummary) {
    forPresentation.push({ id: "customerFacingSummary", label: "Kundevennlig beskrivelse" });
  }
  if (c.ndaRestricted) {
    forPresentation.push({ id: "nda", label: "NDA er satt — kan ikke brukes i presentasjoner" });
  }

  return { forOngoing, forCompleted, forPresentation };
}

/** Label-only view of {@link getMissingItems}, used by list pages. */
export function getMissingInfo(c: CaseFields): MissingInfo {
  const m = getMissingItems(c);
  const labels = (items: MissingItem[]) => items.map((i) => i.label);
  return {
    forOngoing: labels(m.forOngoing),
    forCompleted: labels(m.forCompleted),
    forPresentation: labels(m.forPresentation),
  };
}
