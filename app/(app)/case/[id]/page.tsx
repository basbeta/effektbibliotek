import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getMissingInfo } from "@/lib/cases";
import { formatDate } from "@/lib/format";
import {
  lifecycleStatusLabels,
  usageLevelLabels,
  usageApprovalStatusLabels,
  industryLabels,
  channelLabels,
  caseTypeLabels,
  effectTypeLabels,
  evidenceLevelLabels,
} from "@/lib/labels";
import StatusBadge from "@/components/cases/StatusBadge";
import UsageBadge from "@/components/cases/UsageBadge";
import ApprovalSection from "@/components/cases/ApprovalSection";
import OwnerNameEditor from "@/components/cases/OwnerNameEditor";

type Props = { params: Promise<{ id: string }> };

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      usageApprovals: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });

  if (!c) notFound();

  const missing = getMissingInfo(c);
  const canEdit = c.ownerEmail === session.userEmail || session.isAdmin;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/bibliotek" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          ← Bibliotek
        </Link>
        {canEdit && (
          <Link
            href={`/case/${c.id}/rediger`}
            className="px-4 py-2 text-sm font-medium rounded-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-secondary)",
            }}
          >
            Rediger
          </Link>
        )}
      </div>

      {c.ndaRestricted && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-semibold"
          style={{ backgroundColor: "var(--color-nda-bg)", color: "var(--color-nda-text)" }}
        >
          NDA / Skal ikke deles — denne casen er underlagt konfidensialitet
        </div>
      )}

      <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
        {c.customerName}
      </p>
      <h1 className="text-2xl font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
        {c.title}
      </h1>

      <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
          {(c.owner?.name ?? c.ownerEmail).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Ansvarlig</p>
          <OwnerNameEditor
            name={c.owner?.name ?? c.ownerEmail}
            canEdit={c.ownerEmail === session.userEmail}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatusBadge status={c.lifecycleStatus} />
        <UsageBadge level={c.usageLevel} />
        {c.anonymizedUseOnly && (
          <span
            className="px-2 py-0.5 text-xs font-medium rounded"
            style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning-text)" }}
          >
            Kun anonymisert
          </span>
        )}
        {c.competitionUseAllowed && (
          <span
            className="px-2 py-0.5 text-xs font-medium rounded"
            style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
          >
            Konkurransebruk tillatt
          </span>
        )}
      </div>

      {(missing.forOngoing.length > 0 || missing.forCompleted.length > 0 || missing.forPresentation.length > 0) && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            backgroundColor: "var(--color-surface-muted)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Dette kan kompletteres
          </p>
          <div className="space-y-3">
            {missing.forCompleted.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  For å sette Ferdigstilt:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.forCompleted.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 text-xs rounded"
                      style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning-text)" }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {missing.forPresentation.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  For bruk i presentasjoner:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.forPresentation.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 text-xs rounded"
                      style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning-text)" }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-5 mb-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <Section title="Beskrivelse">{c.summary}</Section>
        {c.problem && <Section title="Problem / kontekst">{c.problem}</Section>}
        {c.solution && <Section title="Løsning">{c.solution}</Section>}
        {c.resultSummary && <Section title="Effekt">{c.resultSummary}</Section>}
        {c.learning && <Section title="Læring">{c.learning}</Section>}
        {c.relevance && <Section title="Relevans">{c.relevance}</Section>}
      </div>

      {(c.effectMetric || c.beforeValue || c.afterValue || c.resultValue) && (
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Effektmåling
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {c.effectMetric && <Detail label="Hva ble målt" value={c.effectMetric} />}
            {c.beforeValue && <Detail label="Før" value={c.beforeValue} />}
            {c.afterValue && <Detail label="Etter" value={c.afterValue} />}
            {c.resultValue && <Detail label="Resultat" value={c.resultValue} />}
            {c.measurementPeriod && <Detail label="Periode" value={c.measurementPeriod} />}
            {c.dataSource && <Detail label="Datakilde" value={c.dataSource} />}
            {c.evidenceLevel && (
              <Detail
                label="Evidensnivå"
                value={evidenceLevelLabels[c.evidenceLevel]}
              />
            )}
          </dl>
          {c.effectTypes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                Effekttype
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.effectTypes.map((et) => (
                  <span
                    key={et}
                    className="px-2 py-0.5 text-xs rounded"
                    style={{
                      backgroundColor: "var(--color-accent-soft)",
                      color: "var(--color-accent)",
                    }}
                  >
                    {effectTypeLabels[et]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="rounded-xl p-5 mb-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Klassifisering
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {c.industry && (
            <Detail label="Bransje" value={industryLabels[c.industry]} />
          )}
        </dl>
        {c.channels.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Kanal</p>
            <ChipList items={c.channels.map((ch) => channelLabels[ch])} />
          </div>
        )}
        {c.caseTypes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Case-type</p>
            <ChipList items={c.caseTypes.map((ct) => caseTypeLabels[ct])} />
          </div>
        )}
      </div>

      {c.customerFacingSummary && (
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            backgroundColor: "var(--color-accent-soft)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
            Kundevennlig beskrivelse
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            {c.customerFacingSummary}
          </p>
        </div>
      )}

      {c.internalNotes && (
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            backgroundColor: "#F5D5CE",
            border: "1px solid #E8B5AB",
          }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-error-text)" }}>
            Interne notater
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {c.internalNotes}
          </p>
        </div>
      )}

      <ApprovalSection
        caseId={c.id}
        status={c.usageApprovalStatus}
        canManage={canEdit}
        lastApproval={c.usageApprovals[0] ?? null}
        approverName={c.approverName}
        approverEmail={c.approverEmail}
      />

      <div
        className="rounded-xl p-4 text-xs mt-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-muted)",
        }}
      >
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          <dt className="font-medium">Ansvarlig:</dt>
          <dd>{c.owner.name}</dd>
          <dt className="font-medium">Opprettet av:</dt>
          <dd>{c.createdBy.name}</dd>
          <dt className="font-medium">Opprettet:</dt>
          <dd>{formatDate(c.createdAt)}</dd>
          <dt className="font-medium">Oppdatert:</dt>
          <dd>{formatDate(c.updatedAt)}</dd>
        </dl>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text-primary)" }}>
        {children}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</dt>
      <dd style={{ color: "var(--color-text-primary)" }}>{value}</dd>
    </>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="px-2 py-0.5 text-xs rounded"
          style={{
            backgroundColor: "var(--color-surface-muted)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-secondary)",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
