export interface MissingInfo {
  forOngoing: string[];
  forCompleted: string[];
  forPresentation: string[];
}

/**
 * Stable ids for the things that can be missing, so the UI can offer the right
 * editor for each one (CR-034). "nda" is information, not an editable field.
 */
export type MissingId = "industry" | "caseTypes" | "channels" | "solution" | "effect" | "nda";

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
  solution: string | null;
  resultSummary: string | null;
  ndaRestricted: boolean;
}

/**
 * What a case still needs (FR-CASE-004/005, FR-MISS-001):
 * - to be set to "Pågår": industry, case type, channel and a solution
 * - to be set to "Ferdigstilt": the same plus an effect
 * - for use in presentations: NDA blocks it
 */
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
  if (!c.solution) {
    forOngoing.push({ id: "solution", label: "Løsning" });
    forCompleted.push({ id: "solution", label: "Løsning" });
  }
  if (!c.resultSummary) forCompleted.push({ id: "effect", label: "Effekt" });

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
