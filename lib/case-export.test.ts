import { describe, it, expect } from "vitest";
import { buildCaseExportText, type CaseExportData } from "@/lib/case-export";
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
import { choiceLabels } from "@/lib/usage-approval";
import { formatDate } from "@/lib/format";

const minimal: CaseExportData = {
  customerName: "Testkunde AS",
  title: "Testcase",
  summary: "Kort beskrivelse",
  lifecycleStatus: "started",
  industry: null,
  caseTypes: [],
  channels: [],
  effectTypes: [],
  solution: null,
  resultSummary: null,
  effectMetric: null,
  beforeValue: null,
  afterValue: null,
  resultValue: null,
  measurementPeriod: null,
  dataSource: null,
  evidenceLevel: null,
  usageApprovalStatus: "not_requested",
  ndaRestricted: false,
  anonymizedUseOnly: false,
  websiteUseAllowed: false,
  presentationUseAllowed: false,
  tenderUseAllowed: false,
  competitionUseAllowed: false,
  ownerName: "Test Eier",
  ownerEmail: "test.eier@example.com",
  createdByName: "Test Oppretter",
  createdAt: "2026-07-01T12:00:00Z",
  links: [],
  files: [],
  usageApprovals: [],
};

describe("buildCaseExportText", () => {
  it("should include the header with title, customer, status and owner", () => {
    const text = buildCaseExportText(minimal);
    expect(text).toContain("CASE-EKSPORT: Testcase");
    expect(text).toContain("Kunde: Testkunde AS");
    expect(text).toContain(`Status: ${lifecycleStatusLabels.started}`);
    expect(text).toContain("Ansvarlig: Test Eier (test.eier@example.com)");
    expect(text).toContain(`Opprettet av: Test Oppretter, ${formatDate("2026-07-01T12:00:00Z")}`);
  });

  it("should omit empty optional fields but always keep the section headings", () => {
    const text = buildCaseExportText(minimal);
    for (const heading of [
      "--- BESKRIVELSE ---",
      "--- EFFEKTMÅLING ---",
      "--- KLASSIFISERING ---",
      "--- TILKNYTTEDE LENKER ---",
      "--- OPPLASTEDE FILER ---",
      "--- BRUKSRETTIGHETER (gjeldende) ---",
      "--- GODKJENNINGSHISTORIKK ---",
    ]) {
      expect(text).toContain(heading);
    }
    expect(text).not.toContain("Pitchtekst");
    expect(text).not.toContain("Problem / kontekst");
    expect(text).not.toContain("Læring");
    expect(text).not.toContain("Kundevennlig beskrivelse");
    expect(text).not.toContain("Relevans");
    expect(text).not.toContain("Interne notater");
    expect(text).not.toContain("Bransje:");
    expect(text).not.toContain("Hva ble målt:");
  });

  it("should say so when there are no links, files, rights or approvals", () => {
    const text = buildCaseExportText(minimal);
    expect(text).toContain("--- TILKNYTTEDE LENKER ---\n(ingen)");
    expect(text).toContain("--- OPPLASTEDE FILER ---\n(ingen)");
    expect(text).toContain("(ingen bruksrettigheter godkjent ennå)");
    expect(text).toContain("(ingen godkjenninger sendt inn)");
    expect(text).toContain(`Status: ${usageApprovalStatusLabels.not_requested}`);
  });

  it("should include filled optional fields and translate enum values to labels", () => {
    const text = buildCaseExportText({
      ...minimal,

      solution: "Løsningstekst",
      effectMetric: "Konvertering",
      evidenceLevel: "documented",
      effectTypes: ["increased_sales", "time_saved"],
      industry: "bank_finance",
      channels: ["sms", "email"],
      caseTypes: ["automation"],
    });
    
    expect(text).toContain("Løsning:\nLøsningstekst");
    expect(text).toContain("Hva ble målt: Konvertering");
    expect(text).toContain(`Evidensnivå: ${evidenceLevelLabels.documented}`);
    expect(text).toContain(
      `Effekttype: ${effectTypeLabels.increased_sales}, ${effectTypeLabels.time_saved}`
    );
    expect(text).toContain(`Bransje: ${industryLabels.bank_finance}`);
    expect(text).toContain(`Kanal: ${channelLabels.sms}, ${channelLabels.email}`);
    expect(text).toContain(`Case-type: ${caseTypeLabels.automation}`);
  });

  it("should list links with type and description", () => {
    const text = buildCaseExportText({
      ...minimal,
      links: [
        { title: "Rapport", url: "https://example.com/r", type: "report", description: "Beskrivelse" },
        { title: "Uten type", url: "https://example.com/x", type: null, description: null },
      ],
    });
    expect(text).toContain(`- Rapport [${caseLinkTypeLabels.report}]: https://example.com/r`);
    expect(text).toContain("  Beskrivelse");
    expect(text).toContain("- Uten type: https://example.com/x");
  });

  it("should list uploaded files with sizes and mention the zip", () => {
    const text = buildCaseExportText({
      ...minimal,
      files: [
        { filename: "bilde.png", sizeBytes: 70 },
        { filename: "stor.pdf", sizeBytes: 5 * 1024 * 1024 },
      ],
    });
    expect(text).toContain("Selve filene ligger i samme .zip-arkiv");
    expect(text).toContain("- bilde.png (70 B)");
    expect(text).toContain("- stor.pdf (5.0 MB)");
  });

  it("should list current usage rights from the case itself", () => {
    const text = buildCaseExportText({
      ...minimal,
      usageApprovalStatus: "submitted_locked",
      websiteUseAllowed: true,
      tenderUseAllowed: true,
    });
    expect(text).toContain(`Status: ${usageApprovalStatusLabels.submitted_locked}`);
    expect(text).toContain(`- ${choiceLabels.websiteUseAllowed}`);
    expect(text).toContain(`- ${choiceLabels.tenderUseAllowed}`);
    expect(text).not.toContain(`- ${choiceLabels.competitionUseAllowed}`);
    expect(text).not.toContain("(ingen bruksrettigheter godkjent ennå)");
  });

  it("should render the full approval history with role and note", () => {
    const text = buildCaseExportText({
      ...minimal,
      usageApprovals: [
        {
          submittedAt: "2026-07-01T22:30:00Z",
          submittedByName: "Test Godkjenner",
          submittedByEmail: "test.godkjenner@example.com",
          submittedByRole: "Rolle",
          note: "Et notat",
          ndaRestricted: false,
          anonymizedUseOnly: false,
          websiteUseAllowed: true,
          presentationUseAllowed: false,
          tenderUseAllowed: false,
          competitionUseAllowed: false,
        },
        {
          submittedAt: "2026-08-01T10:00:00Z",
          submittedByName: "Annen Godkjenner",
          submittedByEmail: "annen@example.com",
          submittedByRole: null,
          note: null,
          ndaRestricted: true,
          anonymizedUseOnly: false,
          websiteUseAllowed: false,
          presentationUseAllowed: false,
          tenderUseAllowed: false,
          competitionUseAllowed: false,
        },
      ],
    });
    expect(text).toContain(
      `Godkjent av Test Godkjenner (test.godkjenner@example.com, Rolle) den ${formatDate("2026-07-01T22:30:00Z")}:`
    );
    expect(text).toContain("Notat: Et notat");
    expect(text).toContain("Godkjent av Annen Godkjenner (annen@example.com) den");
    expect(text).toContain(`- ${choiceLabels.ndaRestricted}`);
    expect(text).not.toContain("(ingen godkjenninger sendt inn)");
  });
});
