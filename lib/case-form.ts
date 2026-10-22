import {
  industryLabels,
  channelLabels,
  caseTypeLabels,
  effectTypeLabels,
} from "@/lib/labels";

/**
 * Pure logic behind the case edit form (CR-033): which sections are complete,
 * which optional blocks are visible, and short summaries for collapsed cards.
 * Kept free of React so it can be unit tested.
 */

export interface CaseFormValues {
  customerName: string;
  title: string;
  summary: string;
  industry: string;
  channels: string[];
  caseTypes: string[];
  solution: string;
  resultSummary: string;
  relevance: string;
  effectTypes: string[];
  effectMetric: string;
  beforeValue: string;
  afterValue: string;
  resultValue: string;
  measurementPeriod: string;
  dataSource: string;
  evidenceLevel: string;
  internalNotes: string;
}

export type SectionKey = "basics" | "classification" | "content";
export const SECTION_ORDER: SectionKey[] = ["basics", "classification", "content"];

export type BlockKey = "effect" | "relevance" | "internalNotes";

/** Optional blocks, in the order they appear in the form. */
export const OPTIONAL_BLOCKS: { key: BlockKey; label: string }[] = [
  { key: "effect", label: "Effektmåling" },
  { key: "relevance", label: "Relevans" },
  { key: "internalNotes", label: "Interne notater" },
];

export interface Progress {
  done: number;
  total: number;
  complete: boolean;
}

function filled(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

function progress(done: number, total: number): Progress {
  return { done, total, complete: done === total };
}

/**
 * Completeness per section. The items mirror what FR-CASE-004/005 require to
 * set status to "Pågår"/"Ferdigstilt", so the form and the missing-info panel
 * agree on what "complete" means.
 */
export function getSectionProgress(v: CaseFormValues): Record<SectionKey, Progress> {
  const basics = [v.customerName, v.title, v.summary].filter(filled).length;
  const classification =
    (filled(v.industry) ? 1 : 0) + (v.channels.length > 0 ? 1 : 0) + (v.caseTypes.length > 0 ? 1 : 0);
  const content = (filled(v.solution) ? 1 : 0) + (filled(v.resultSummary) ? 1 : 0);

  return {
    basics: progress(basics, 3),
    classification: progress(classification, 3),
    content: progress(content, 2),
  };
}

/** The first section that still has something to fill in, or null if all are complete. */
export function firstIncompleteSection(p: Record<SectionKey, Progress>): SectionKey | null {
  return SECTION_ORDER.find((key) => !p[key].complete) ?? null;
}

/** True if any of the less common measurement details are filled in. */
export function hasExtraEffectDetails(v: CaseFormValues): boolean {
  return [v.beforeValue, v.afterValue, v.measurementPeriod, v.dataSource].some(filled);
}

/** Optional blocks that already contain data and must therefore always be shown. */
export function getBlocksWithContent(v: CaseFormValues): BlockKey[] {
  const hasEffect =
    v.effectTypes.length > 0 ||
    [v.effectMetric, v.resultValue, v.evidenceLevel].some(filled) ||
    hasExtraEffectDetails(v);

  const present: Record<BlockKey, boolean> = {
    effect: hasEffect,
    relevance: filled(v.relevance),
    internalNotes: filled(v.internalNotes),
  };
  return OPTIONAL_BLOCKS.map((b) => b.key).filter((key) => present[key]);
}

function join(parts: string[]): string {
  return parts.filter(Boolean).join(" · ");
}

function excerpt(text: string, max = 80): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** A short summary shown on a collapsed section card. Empty string when there is nothing to show. */
export function getSectionSummary(key: SectionKey, v: CaseFormValues): string {
  if (key === "basics") {
    return [v.customerName.trim(), v.title.trim()].filter(Boolean).join(" — ");
  }
  if (key === "classification") {
    return join([
      industryLabels[v.industry as keyof typeof industryLabels] ?? "",
      ...v.channels.map((c) => channelLabels[c as keyof typeof channelLabels] ?? c),
      ...v.caseTypes.map((t) => caseTypeLabels[t as keyof typeof caseTypeLabels] ?? t),
    ]);
  }
  return join([filled(v.solution) ? "Løsning" : "", filled(v.resultSummary) ? "Effekt" : ""]);
}

/** A short summary for a collapsed optional block. */
export function getBlockSummary(key: BlockKey, v: CaseFormValues): string {
  switch (key) {
    case "effect": {
      const measured = [v.effectMetric.trim(), v.resultValue.trim()].filter(Boolean).join(": ");
      if (measured) return measured;
      return join(v.effectTypes.map((t) => effectTypeLabels[t as keyof typeof effectTypeLabels] ?? t));
    }
    case "relevance":
      return excerpt(v.relevance);
    case "internalNotes":
      return excerpt(v.internalNotes);
  }
}

/**
 * Options for a searchable multi-select: drops already selected values and
 * filters on the label (case-insensitive). Labels that start with the query
 * come before labels that merely contain it; otherwise the original order is kept.
 */
export function filterOptions(
  options: Record<string, string>,
  selected: string[],
  query: string
): [string, string][] {
  const q = query.trim().toLocaleLowerCase("nb-NO");
  const entries = Object.entries(options).filter(([value]) => !selected.includes(value));
  if (!q) return entries;

  const startsWith: [string, string][] = [];
  const contains: [string, string][] = [];
  for (const entry of entries) {
    const label = entry[1].toLocaleLowerCase("nb-NO");
    if (label.startsWith(q)) startsWith.push(entry);
    else if (label.includes(q)) contains.push(entry);
  }
  return [...startsWith, ...contains];
}
