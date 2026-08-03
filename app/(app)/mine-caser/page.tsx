import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getMissingInfo } from "@/lib/cases";
import CaseRow, { type CaseRowData } from "@/components/cases/CaseRow";

function toCaseRow(c: Parameters<typeof getMissingInfo>[0] & {
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
  owner: { name: string };
}): CaseRowData {
  const missing = getMissingInfo(c);
  const allMissing = [...new Set([...missing.forOngoing, ...missing.forCompleted])];
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
    missing: allMissing,
    updatedAt: c.updatedAt,
    owner: c.owner,
  };
}

export default async function MineCaserPage() {
  const session = await requireSession();

  const [asOwner, asCreatorOnly] = await Promise.all([
    prisma.case.findMany({
      where: { ownerEmail: session.userEmail },
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.case.findMany({
      where: {
        createdByEmail: session.userEmail,
        NOT: { ownerEmail: session.userEmail },
      },
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const needsFollowUp = asOwner
    .map(toCaseRow)
    .filter((c) => c.missing.length > 0);

  const ownerRows = asOwner.map(toCaseRow);
  const creatorRows = asCreatorOnly.map(toCaseRow);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Mine caser
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Oversikt over caser du er ansvarlig for eller har opprettet.
      </p>

      {needsFollowUp.length > 0 && (
        <Section title="Trenger oppfølging" count={needsFollowUp.length} accent>
          {needsFollowUp.map((c) => (
            <CaseRow key={c.id} c={c} />
          ))}
        </Section>
      )}

      <Section title="Jeg er ansvarlig" count={ownerRows.length}>
        {ownerRows.length === 0 ? (
          <Empty text="Ingen caser der du er ansvarlig." />
        ) : (
          ownerRows.map((c) => <CaseRow key={c.id} c={c} />)
        )}
      </Section>

      <Section title="Jeg har opprettet" count={creatorRows.length}>
        {creatorRows.length === 0 ? (
          <Empty text="Ingen caser du har opprettet (uten å være ansvarlig)." />
        ) : (
          creatorRows.map((c) => <CaseRow key={c.id} c={c} showOwner />)
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h2>
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: accent ? "var(--color-warning-bg)" : "var(--color-surface-muted)",
            color: accent ? "var(--color-warning-text)" : "var(--color-text-muted)",
          }}
        >
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
      {text}
    </p>
  );
}
