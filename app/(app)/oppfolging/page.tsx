import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import CaseRow, { type CaseRowData } from "@/components/cases/CaseRow";

const STALE_DAYS = 30;

interface RawCase {
  id: string;
  customerName: string;
  title: string;
  lifecycleStatus: string;
  ndaRestricted: boolean;
  anonymizedUseOnly: boolean;
  websiteUseAllowed: boolean;
  presentationUseAllowed: boolean;
  tenderUseAllowed: boolean;
  competitionUseAllowed: boolean;
  updatedAt: Date;
  industry: string | null;
  caseTypes: string[];
  channels: string[];
  problem: string | null;
  solution: string | null;
  resultSummary: string | null;
  learning: string | null;
  customerFacingSummary: string | null;
  pitchText: string | null;
  usageApprovalStatus: string;
  owner: { name: string; email: string };
}

function toRow(c: RawCase, missing: string[]): CaseRowData {
  return {
    id: c.id,
    customerName: c.customerName,
    title: c.title,
    lifecycleStatus: c.lifecycleStatus,
    ndaRestricted: c.ndaRestricted,
    anonymizedUseOnly: c.anonymizedUseOnly,
    websiteUseAllowed: c.websiteUseAllowed,
    presentationUseAllowed: c.presentationUseAllowed,
    tenderUseAllowed: c.tenderUseAllowed,
    competitionUseAllowed: c.competitionUseAllowed,
    missing,
    updatedAt: c.updatedAt,
    owner: c.owner,
  };
}

export default async function OppfolgingPage() {
  await requireSession();

  const cases = await prisma.case.findMany({
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
  }) as RawCase[];

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const groups = {
    missingEffect: [] as CaseRowData[],
    missingApproval: [] as CaseRowData[],
    missingCustomerSummary: [] as CaseRowData[],
    missingPitch: [] as CaseRowData[],
    missingClassification: [] as CaseRowData[],
    stale: [] as CaseRowData[],
  };

  for (const c of cases) {
    if (!c.resultSummary && !c.learning) {
      groups.missingEffect.push(toRow(c, ["Effekt eller læring"]));
    }
    if (
      c.usageApprovalStatus === "not_requested" &&
      (c.lifecycleStatus === "ongoing" || c.lifecycleStatus === "completed")
    ) {
      groups.missingApproval.push(toRow(c, ["Bruksgodkjenning ikke sendt"]));
    }
    if (!c.customerFacingSummary) {
      groups.missingCustomerSummary.push(toRow(c, ["Kundevennlig beskrivelse"]));
    }
    if (!c.pitchText) {
      groups.missingPitch.push(toRow(c, ["Pitchtekst"]));
    }
    if (!c.channels.length || !c.caseTypes.length) {
      const m: string[] = [];
      if (!c.channels.length) m.push("Kanal");
      if (!c.caseTypes.length) m.push("Case-type");
      groups.missingClassification.push(toRow(c, m));
    }
    if (c.lifecycleStatus !== "completed" && c.updatedAt < cutoff) {
      groups.stale.push(toRow(c, [`Ikke oppdatert på ${STALE_DAYS}+ dager`]));
    }
  }

  const totalIssues = Object.values(groups).reduce((n, g) => n + g.length, 0);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Oppfølging
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Caser som kan kompletteres, gruppert etter hva som mangler.
      </p>

      {totalIssues === 0 && (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <p className="font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            Ingenting å følge opp
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Alle caser ser komplette ut.
          </p>
        </div>
      )}

      <FollowUpGroup
        title="Mangler effekt eller læring"
        cases={groups.missingEffect}
      />
      <FollowUpGroup
        title="Bruksgodkjenning ikke sendt"
        description="Caser med status Pågår eller Ferdigstilt uten bruksgodkjenning."
        cases={groups.missingApproval}
      />
      <FollowUpGroup
        title="Mangler kundevennlig beskrivelse"
        cases={groups.missingCustomerSummary}
      />
      <FollowUpGroup
        title="Mangler pitchtekst"
        cases={groups.missingPitch}
      />
      <FollowUpGroup
        title="Mangler kanal eller case-type"
        cases={groups.missingClassification}
      />
      <FollowUpGroup
        title={`Ikke oppdatert på ${STALE_DAYS}+ dager`}
        description="Pågående caser som ikke har vært redigert på lenge."
        cases={groups.stale}
      />
    </div>
  );
}

function FollowUpGroup({
  title,
  description,
  cases,
}: {
  title: string;
  description?: string;
  cases: CaseRowData[];
}) {
  if (cases.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h2>
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: "var(--color-warning-bg)",
            color: "var(--color-warning-text)",
          }}
        >
          {cases.length}
        </span>
      </div>
      {description && (
        <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      )}
      <div className="space-y-2">
        {cases.map((c) => (
          <CaseRow key={c.id} c={c} showOwner />
        ))}
      </div>
    </div>
  );
}
