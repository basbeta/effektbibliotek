import {
  lifecycleStatusLabels,
  usageApprovalStatusLabels,
  industryLabels,
  channelLabels,
  caseTypeLabels,
  effectTypeLabels,
  evidenceLevelLabels,
  caseLinkTypeLabels,
} from "@/lib/labels";
import { choiceLabels, type ApprovalChoices } from "@/lib/usage-approval";
import { formatDate, formatBytes } from "@/lib/format";
import type {
  CaseLifecycleStatus,
  UsageApprovalStatus,
  Industry,
  CaseType,
  Channel,
  EffectType,
  EvidenceLevel,
  CaseLinkType,
} from "@/app/generated/prisma/client";

export interface CaseExportLink {
  title: string;
  url: string;
  type: CaseLinkType | null;
  description: string | null;
}

export interface CaseExportFile {
  filename: string;
  sizeBytes: number;
}

export interface CaseExportApproval extends ApprovalChoices {
  submittedAt: Date | string;
  submittedByName: string;
  submittedByEmail: string;
  submittedByRole: string | null;
  note: string | null;
}

export interface CaseExportData extends ApprovalChoices {
  customerName: string;
  title: string;
  summary: string;
  customerFacingSummary: string | null;
  lifecycleStatus: CaseLifecycleStatus;
  industry: Industry | null;
  caseTypes: CaseType[];
  channels: Channel[];
  effectTypes: EffectType[];
  problem: string | null;
  solution: string | null;
  resultSummary: string | null;
  learning: string | null;
  relevance: string | null;
  pitchText: string | null;
  internalNotes: string | null;
  effectMetric: string | null;
  beforeValue: string | null;
  afterValue: string | null;
  resultValue: string | null;
  measurementPeriod: string | null;
  dataSource: string | null;
  evidenceLevel: EvidenceLevel | null;
  usageApprovalStatus: UsageApprovalStatus;
  ownerName: string;
  ownerEmail: string;
  createdByName: string;
  createdAt: Date | string;
  links: CaseExportLink[];
  files: CaseExportFile[];
  usageApprovals: CaseExportApproval[];
}

function usageRightsLines(choices: ApprovalChoices): string[] {
  return (Object.keys(choiceLabels) as (keyof ApprovalChoices)[])
    .filter((key) => choices[key])
    .map((key) => `- ${choiceLabels[key]}`);
}

export function buildCaseExportText(c: CaseExportData): string {
  const lines: string[] = [];

  lines.push(`CASE-EKSPORT: ${c.title}`);
  lines.push(`Kunde: ${c.customerName}`);
  lines.push(`Status: ${lifecycleStatusLabels[c.lifecycleStatus]}`);
  lines.push(`Ansvarlig: ${c.ownerName} (${c.ownerEmail})`);
  lines.push(`Opprettet av: ${c.createdByName}, ${formatDate(c.createdAt)}`);
  lines.push("");

  lines.push("--- BESKRIVELSE ---");
  lines.push(c.summary);
  if (c.problem) lines.push(`\nProblem / kontekst:\n${c.problem}`);
  if (c.solution) lines.push(`\nLøsning:\n${c.solution}`);
  if (c.resultSummary) lines.push(`\nEffekt:\n${c.resultSummary}`);
  if (c.learning) lines.push(`\nLæring:\n${c.learning}`);
  if (c.relevance) lines.push(`\nRelevans:\n${c.relevance}`);
  if (c.pitchText) lines.push(`\nPitchtekst:\n${c.pitchText}`);
  if (c.customerFacingSummary) lines.push(`\nKundevennlig beskrivelse:\n${c.customerFacingSummary}`);
  if (c.internalNotes) lines.push(`\nInterne notater:\n${c.internalNotes}`);
  lines.push("");

  lines.push("--- EFFEKTMÅLING ---");
  if (c.effectMetric) lines.push(`Hva ble målt: ${c.effectMetric}`);
  if (c.beforeValue) lines.push(`Før: ${c.beforeValue}`);
  if (c.afterValue) lines.push(`Etter: ${c.afterValue}`);
  if (c.resultValue) lines.push(`Resultat: ${c.resultValue}`);
  if (c.measurementPeriod) lines.push(`Periode: ${c.measurementPeriod}`);
  if (c.dataSource) lines.push(`Datakilde: ${c.dataSource}`);
  if (c.evidenceLevel) lines.push(`Evidensnivå: ${evidenceLevelLabels[c.evidenceLevel]}`);
  if (c.effectTypes.length > 0) {
    lines.push(`Effekttype: ${c.effectTypes.map((et) => effectTypeLabels[et]).join(", ")}`);
  }
  lines.push("");

  lines.push("--- KLASSIFISERING ---");
  if (c.industry) lines.push(`Bransje: ${industryLabels[c.industry]}`);
  if (c.channels.length > 0) lines.push(`Kanal: ${c.channels.map((ch) => channelLabels[ch]).join(", ")}`);
  if (c.caseTypes.length > 0) lines.push(`Case-type: ${c.caseTypes.map((ct) => caseTypeLabels[ct]).join(", ")}`);
  lines.push("");

  lines.push("--- TILKNYTTEDE LENKER ---");
  if (c.links.length === 0) {
    lines.push("(ingen)");
  } else {
    for (const link of c.links) {
      const type = link.type ? ` [${caseLinkTypeLabels[link.type]}]` : "";
      lines.push(`- ${link.title}${type}: ${link.url}`);
      if (link.description) lines.push(`  ${link.description}`);
    }
  }
  lines.push("");

  lines.push("--- OPPLASTEDE FILER ---");
  if (c.files.length === 0) {
    lines.push("(ingen)");
  } else {
    lines.push("Selve filene ligger i samme .zip-arkiv som denne tekstfilen.");
    for (const file of c.files) {
      lines.push(`- ${file.filename} (${formatBytes(file.sizeBytes)})`);
    }
  }
  lines.push("");

  lines.push("--- BRUKSRETTIGHETER (gjeldende) ---");
  lines.push(`Status: ${usageApprovalStatusLabels[c.usageApprovalStatus]}`);
  const currentLines = usageRightsLines(c);
  lines.push(...(currentLines.length > 0 ? currentLines : ["(ingen bruksrettigheter godkjent ennå)"]));
  lines.push("");

  lines.push("--- GODKJENNINGSHISTORIKK ---");
  if (c.usageApprovals.length === 0) {
    lines.push("(ingen godkjenninger sendt inn)");
  } else {
    for (const approval of c.usageApprovals) {
      lines.push(
        `\nGodkjent av ${approval.submittedByName} (${approval.submittedByEmail}${approval.submittedByRole ? `, ${approval.submittedByRole}` : ""}) den ${formatDate(approval.submittedAt)}:`
      );
      lines.push(...usageRightsLines(approval));
      if (approval.note) lines.push(`Notat: ${approval.note}`);
    }
  }

  return lines.join("\n");
}
