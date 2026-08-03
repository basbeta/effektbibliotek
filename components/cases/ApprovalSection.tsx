"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { choiceLabels, type ApprovalChoices } from "@/lib/usage-approval";
import { usageApprovalStatusLabels } from "@/lib/labels";

interface LastApproval {
  submittedAt: string | Date;
  submittedByName: string;
  submittedByEmail: string;
  submittedByRole: string | null;
  note: string | null;
  ndaRestricted: boolean;
  internalUseAllowed: boolean;
  anonymizedUseOnly: boolean;
  presentationUseAllowed: boolean;
  competitionUseAllowed: boolean;
}

interface Props {
  caseId: string;
  status: string;
  canManage: boolean;
  lastApproval: LastApproval | null;
  approverName: string | null;
  approverEmail: string | null;
}

export default function ApprovalSection({
  caseId,
  status: initialStatus,
  canManage,
  lastApproval,
  approverName: initialApproverName,
  approverEmail: initialApproverEmail,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [approverName, setApproverName] = useState(initialApproverName ?? "");
  const [approverEmail, setApproverEmail] = useState(initialApproverEmail ?? "");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/send-approval-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverName, approverEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Kunne ikke sende forespørsel.");
        return;
      }
      setSent(true);
      setStatus("open");
      router.refresh();
      setTimeout(() => setSent(false), 3000);
    } catch {
      setError("Noe gikk galt.");
    } finally {
      setSending(false);
    }
  }

  async function handleUnlock() {
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/unlock-approval`, { method: "POST" });
      if (!res.ok) { setError("Kunne ikke låse opp."); return; }
      setStatus("open");
      setConfirmUnlock(false);
      router.refresh();
    } catch {
      setError("Noe gikk galt.");
    } finally {
      setUnlocking(false);
    }
  }

  const statusLabel = usageApprovalStatusLabels[status as keyof typeof usageApprovalStatusLabels] ?? status;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Bruksgodkjenning
        </p>
        <StatusPill status={status} label={statusLabel} />
      </div>

      {status === "submitted_locked" && lastApproval ? (
        <div className="space-y-3">
          <dl className="text-sm space-y-1">
            <Row label="Sendt inn av" value={`${lastApproval.submittedByName} (${lastApproval.submittedByEmail})`} />
            {lastApproval.submittedByRole && <Row label="Rolle" value={lastApproval.submittedByRole} />}
            <Row label="Tidspunkt" value={formatDate(lastApproval.submittedAt)} />
          </dl>
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Valg</p>
            <div className="space-y-1">
              {(Object.keys(choiceLabels) as (keyof ApprovalChoices)[]).map((k) =>
                lastApproval[k] ? (
                  <p key={k} className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    ✓ {choiceLabels[k]}
                  </p>
                ) : null
              )}
            </div>
          </div>
          {lastApproval.note && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Kommentar</p>
              <p className="text-sm italic" style={{ color: "var(--color-text-secondary)" }}>{lastApproval.note}</p>
            </div>
          )}

          {canManage && (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              {confirmUnlock ? (
                <div className="flex items-center gap-3">
                  <p className="text-sm flex-1" style={{ color: "var(--color-warning-text)" }}>
                    Er du sikker? Dette genererer en ny lenke og gjør det mulig å sende inn på nytt.
                  </p>
                  <button
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-60"
                    style={{ backgroundColor: "var(--color-destructive-bg)" }}
                  >
                    {unlocking ? "..." : "Bekreft"}
                  </button>
                  <button
                    onClick={() => setConfirmUnlock(false)}
                    className="px-3 py-1.5 text-xs rounded-lg"
                    style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmUnlock(true)}
                  className="text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Lås opp godkjenning
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {status === "open" && (
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {approverName
                ? `Sendt til ${approverName} (${approverEmail}) — venter på svar.`
                : "Venter på svar fra kunde."}
            </p>
          )}
          {canManage && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Navn på godkjenner
                </label>
                <input
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Ola Nordmann"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border-strong)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  E-post til godkjenner
                </label>
                <input
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  placeholder="ola@kunde.no"
                  type="email"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border-strong)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !approverName.trim() || !approverEmail.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-60 self-start"
                style={{
                  backgroundColor: sent ? "var(--color-accent-soft)" : "var(--color-surface-muted)",
                  border: `1px solid ${sent ? "var(--color-accent)" : "var(--color-border-strong)"}`,
                  color: sent ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {sent ? "Sendt!" : sending ? "Sender…" : status === "open" ? "Send på nytt" : "Send godkjenningsforespørsel"}
              </button>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Du får kopi av e-posten (cc).
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--color-error-text)" }}>{error}</p>
      )}
    </div>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    not_requested: { bg: "var(--color-surface-muted)", text: "var(--color-text-muted)" },
    open: { bg: "var(--color-warning-bg)", text: "var(--color-warning-text)" },
    submitted_locked: { bg: "var(--color-status-completed-bg)", text: "var(--color-status-completed-text)" },
  };
  const s = styles[status] ?? styles.not_requested;
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-xs font-medium flex-shrink-0" style={{ color: "var(--color-text-muted)", minWidth: "80px" }}>{label}</dt>
      <dd className="text-xs" style={{ color: "var(--color-text-primary)" }}>{value}</dd>
    </div>
  );
}
