import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApprovalForm from "./ApprovalForm";

type Props = { params: Promise<{ caseId: string; token: string }> };

const BETA_NOTICE =
  "Effektbiblioteket er foreløpig i betatesting. Gi gjerne beskjed til kontaktpersonen din i Bas hvis noe er uklart, feil eller burde fungere annerledes.";

export default async function GodkjenningPage({ params }: Props) {
  const { caseId, token } = await params;

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      customerName: true,
      title: true,
      customerFacingSummary: true,
      usageApprovalStatus: true,
      usageApprovalToken: true,
      approverName: true,
      approverEmail: true,
      owner: { select: { name: true, email: true } },
    },
  });

  if (!c || c.usageApprovalToken !== token) notFound();

  const isLocked = c.usageApprovalStatus === "submitted_locked";
  const isOpen = c.usageApprovalStatus === "open";

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-lg mx-auto">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-text-muted)" }}>
            Bas Kommunikasjon — Effektbibliotek
          </p>
          <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>
            {c.customerName}
          </p>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {c.title}
          </h1>
        </div>

        {c.customerFacingSummary && (
          <div
            className="rounded-xl p-5 mb-6"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              {c.customerFacingSummary}
            </p>
          </div>
        )}

        <div
          className="rounded-xl p-5 mb-6"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {isLocked ? (
            <LockedView ownerName={c.owner.name} ownerEmail={c.owner.email} />
          ) : isOpen ? (
            <ApprovalForm
              caseId={c.id}
              token={token}
              ownerName={c.owner.name}
              defaultName={c.approverName ?? ""}
              defaultEmail={c.approverEmail ?? ""}
            />
          ) : (
            <InvalidLink ownerName={c.owner.name} ownerEmail={c.owner.email} />
          )}
        </div>

        <p className="text-xs text-center px-4" style={{ color: "var(--color-text-muted)" }}>
          {BETA_NOTICE}
        </p>
      </div>
    </div>
  );
}

function LockedView({ ownerName, ownerEmail }: { ownerName: string; ownerEmail: string }) {
  return (
    <div className="text-center py-4">
      <p className="font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
        Godkjenningen er allerede sendt inn
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Vi har registrert din tilbakemelding. Kontakt{" "}
        <span style={{ color: "var(--color-accent)" }}>{ownerName}</span>{" "}
        på <span style={{ color: "var(--color-accent)" }}>{ownerEmail}</span>{" "}
        i Bas hvis du ønsker å endre noe.
      </p>
    </div>
  );
}

function InvalidLink({ ownerName, ownerEmail }: { ownerName: string; ownerEmail: string }) {
  return (
    <div className="text-center py-4">
      <p className="font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
        Denne lenken er ikke lenger aktiv
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Kontakt{" "}
        <span style={{ color: "var(--color-accent)" }}>{ownerName}</span>{" "}
        på <span style={{ color: "var(--color-accent)" }}>{ownerEmail}</span>{" "}
        i Bas for en ny lenke.
      </p>
    </div>
  );
}
