"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  lifecycleStatusLabels,
  industryLabels,
  caseTypeLabels,
  channelLabels,
  effectTypeLabels,
  evidenceLevelLabels,
} from "@/lib/labels";
import { formatDate, formatBytes } from "@/lib/format";

import LinksSection from "@/components/cases/LinksSection";
import ApprovalSection from "@/components/cases/ApprovalSection";

type SelectValue = string;

interface CaseData {
  id: string;
  customerName: string;
  title: string;
  summary: string;
  customerFacingSummary: string | null;
  lifecycleStatus: string;
  industry: string | null;
  caseTypes: string[];
  channels: string[];
  effectTypes: string[];
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
  evidenceLevel: string | null;
  ownerEmail: string;
}

function n(v: string | null | undefined): string {
  return v ?? "";
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: string | null;
  description: string | null;
}

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface ApprovalHistoryItem {
  submittedAt: string | Date;
  submittedByName: string;
  submittedByEmail: string;
  submittedByRole: string | null;
  note: string | null;
  ndaRestricted: boolean;
  anonymizedUseOnly: boolean;
  websiteUseAllowed: boolean;
  presentationUseAllowed: boolean;
  tenderUseAllowed: boolean;
  competitionUseAllowed: boolean;
}

export default function EditCaseForm({
  initial,
  isAdmin,
  isOwner,
  links,
  files,
  usageApprovalStatus,
  usageApprovals,
  approverName,
  approverEmail,
  ownerName,
  token,
  appUrl,
}: {
  initial: CaseData;
  isAdmin?: boolean;
  isOwner?: boolean;
  links?: LinkItem[];
  files?: FileItem[];
  usageApprovalStatus?: string;
  usageApprovals?: ApprovalHistoryItem[];
  approverName?: string | null;
  approverEmail?: string | null;
  ownerName: string;
  token?: string | null;
  appUrl: string;
}) {
  const router = useRouter();
  const canManageCase = !!isAdmin || !!isOwner;
  const [form, setForm] = useState({
    customerName: n(initial.customerName),
    title: n(initial.title),
    summary: n(initial.summary),
    customerFacingSummary: n(initial.customerFacingSummary),
    lifecycleStatus: initial.lifecycleStatus,
    industry: n(initial.industry),
    caseTypes: initial.caseTypes ?? [],
    channels: initial.channels ?? [],
    effectTypes: initial.effectTypes ?? [],
    problem: n(initial.problem),
    solution: n(initial.solution),
    resultSummary: n(initial.resultSummary),
    learning: n(initial.learning),
    relevance: n(initial.relevance),
    pitchText: n(initial.pitchText),
    internalNotes: n(initial.internalNotes),
    effectMetric: n(initial.effectMetric),
    beforeValue: n(initial.beforeValue),
    afterValue: n(initial.afterValue),
    resultValue: n(initial.resultValue),
    measurementPeriod: n(initial.measurementPeriod),
    dataSource: n(initial.dataSource),
    evidenceLevel: n(initial.evidenceLevel),
    ownerEmail: initial.ownerEmail,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState<{ email: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // fetch user list for owner-change (available to the owner themselves, not just admin)
  const loadedUsersRef = useRef(false);
  if (canManageCase && !loadedUsersRef.current) {
    loadedUsersRef.current = true;
    fetch("/api/admin/users/list")
      .then((r) => r.ok ? r.json() : [])
      .then(setAllUsers)
      .catch(() => {});
  }

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleArray(field: string, value: string) {
    const arr = form[field as keyof typeof form] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    set(field, next);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/cases/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Kunne ikke slette casen.");
        return;
      }
      router.push("/bibliotek");
    } catch {
      setDeleteError("Noe gikk galt.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.customerName.trim() || !form.title.trim() || !form.summary.trim()) {
      setError("Kundenavn, tittel og beskrivelse er påkrevd.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          industry: form.industry || null,
          evidenceLevel: form.evidenceLevel || null,
          customerFacingSummary: form.customerFacingSummary || null,
          problem: form.problem || null,
          solution: form.solution || null,
          resultSummary: form.resultSummary || null,
          learning: form.learning || null,
          relevance: form.relevance || null,
          pitchText: form.pitchText || null,
          internalNotes: form.internalNotes || null,
          effectMetric: form.effectMetric || null,
          beforeValue: form.beforeValue || null,
          afterValue: form.afterValue || null,
          resultValue: form.resultValue || null,
          measurementPeriod: form.measurementPeriod || null,
          dataSource: form.dataSource || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Noe gikk galt.");
        return;
      }

      router.push(`/case/${initial.id}`);
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <FormSection title="Grunninfo">
        <Field label="Kundenavn" required>
          <input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Tittel" required>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Beskrivelse" required>
          <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={4} className={inputCls + " resize-y"} style={inputStyle} />
        </Field>
        <Field label="Status">
          <select value={form.lifecycleStatus} onChange={(e) => set("lifecycleStatus", e.target.value)} className={inputCls} style={inputStyle}>
            {Object.entries(lifecycleStatusLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        {canManageCase && allUsers.length > 0 && (
          <Field label="Ansvarlig">
            <select value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} className={inputCls} style={inputStyle}>
              {allUsers.map((u) => (
                <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
              ))}
            </select>
          </Field>
        )}
      </FormSection>

      <FormSection title="Klassifisering">
        <Field label="Bransje">
          <select value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">— Ikke satt —</option>
            {Object.entries(industryLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <CheckboxGroup
          label="Kanal"
          options={channelLabels}
          selected={form.channels}
          onToggle={(v) => toggleArray("channels", v)}
        />
        <CheckboxGroup
          label="Case-type"
          options={caseTypeLabels}
          selected={form.caseTypes}
          onToggle={(v) => toggleArray("caseTypes", v)}
        />
      </FormSection>

      <FormSection title="Innhold">
        <Field label="Problem / kontekst">
          <textarea value={form.problem} onChange={(e) => set("problem", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
        </Field>
        <Field label="Løsning">
          <textarea value={form.solution} onChange={(e) => set("solution", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
        </Field>
        <Field label="Effekt">
          <textarea value={form.resultSummary} onChange={(e) => set("resultSummary", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
        </Field>
        <Field label="Læring">
          <textarea value={form.learning} onChange={(e) => set("learning", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
        </Field>
        <Field label="Relevans">
          <textarea value={form.relevance} onChange={(e) => set("relevance", e.target.value)} rows={2} className={inputCls + " resize-y"} style={inputStyle} />
        </Field>
      </FormSection>

      <FormSection title="Effektmåling">
        <CheckboxGroup
          label="Effekttype"
          options={effectTypeLabels}
          selected={form.effectTypes}
          onToggle={(v) => toggleArray("effectTypes", v)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hva ble målt">
            <input value={form.effectMetric} onChange={(e) => set("effectMetric", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Evidensnivå">
            <select value={form.evidenceLevel} onChange={(e) => set("evidenceLevel", e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">— Ikke satt —</option>
              {Object.entries(evidenceLevelLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Før">
            <input value={form.beforeValue} onChange={(e) => set("beforeValue", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Etter">
            <input value={form.afterValue} onChange={(e) => set("afterValue", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Resultat">
            <input value={form.resultValue} onChange={(e) => set("resultValue", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Periode">
            <input value={form.measurementPeriod} onChange={(e) => set("measurementPeriod", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Datakilde">
            <input value={form.dataSource} onChange={(e) => set("dataSource", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Innsalg">
        <Field label="Pitchtekst">
          <textarea value={form.pitchText} onChange={(e) => set("pitchText", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} placeholder={'Hva ble brukt som innsalgsargument? Eks: "Kunden ba om det selv." "Det er mer å tjene på å vite dette enn å bruke tid på å diskutere og synse!"'} />
        </Field>
      </FormSection>

      <FormSection title="Kundevendt">
        <Field label="Kundevennlig beskrivelse">
          <textarea value={form.customerFacingSummary} onChange={(e) => set("customerFacingSummary", e.target.value)} rows={4} className={inputCls + " resize-y"} style={inputStyle} placeholder="Trygg tekst som kan vises til kunden" />
        </Field>
      </FormSection>

      <ApprovalSection
        caseId={initial.id}
        status={usageApprovalStatus ?? "not_requested"}
        canManage={canManageCase}
        lastApproval={usageApprovals?.[0] ?? null}
        approverName={approverName ?? null}
        approverEmail={approverEmail ?? null}
        caseTitle={form.title || initial.title}
        ownerName={ownerName}
        ownerEmail={form.ownerEmail}
        token={token ?? null}
        appUrl={appUrl}
      />

      <FormSection title="Interne notater">
        <Field label="Interne notater">
          <textarea value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} placeholder="Vises aldri til kunder" />
        </Field>
      </FormSection>

      <LinksSection caseId={initial.id} links={links ?? []} files={files ?? []} canManage={true} />

      {canManageCase && (
        <FormSection title="Farlig sone">
          <a
            href={`/api/cases/${initial.id}/export`}
            className="text-sm inline-block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Eksporter alt innhold (tekst, lenker, godkjenninger)
          </a>

          {confirmDelete ? (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error-text)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--color-error-text)" }}>
                Dette vil slette casen «{initial.title}» permanent. Dette kan ikke angres.
              </p>

              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Tilknyttede lenker/filer som slettes:
                </p>
                {(links && links.length > 0) || (files && files.length > 0) ? (
                  <ul className="text-xs space-y-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {links?.map((l) => (
                      <li key={l.id}>— {l.title}: {l.url}</li>
                    ))}
                    {files?.map((f) => (
                      <li key={f.id}>— {f.filename} ({formatBytes(f.sizeBytes)})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>(ingen)</p>
                )}
              </div>

              {usageApprovals && usageApprovals.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                    Denne casen har følgende godkjenninger fra {initial.customerName}:
                  </p>
                  <ul className="text-xs space-y-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {usageApprovals.map((a, i) => (
                      <li key={i}>
                        — lagt inn av {a.submittedByName} den {formatDate(a.submittedAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={`/api/cases/${initial.id}/export`}
                className="text-xs inline-block font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                Eksporter alt før du sletter
              </a>

              {deleteError && (
                <p className="text-sm" style={{ color: "var(--color-error-text)" }}>{deleteError}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-60"
                  style={{ backgroundColor: "var(--color-destructive-bg)" }}
                >
                  {deleting ? "Sletter..." : "Ja, slett permanent"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm font-medium block"
              style={{ color: "var(--color-error-text)" }}
            >
              Slett case
            </button>
          )}
        </FormSection>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--color-error-text)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pb-12">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {saving ? "Lagrer..." : "Lagre"}
        </button>
        <Link
          href={`/case/${initial.id}`}
          className="px-6 py-2.5 text-sm font-medium rounded-lg"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-secondary)",
          }}
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg outline-none";
const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border-strong)",
  color: "var(--color-text-primary)",
};

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-base font-semibold mb-4 pb-2"
        style={{
          color: "var(--color-text-primary)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
        {label}
        {required && <span style={{ color: "var(--color-error-text)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Record<string, string>;
  selected: string[];
  onToggle: (v: SelectValue) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([v, l]) => {
          const checked = selected.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v)}
              className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{
                backgroundColor: checked ? "var(--color-accent-soft)" : "var(--color-surface)",
                borderColor: checked ? "var(--color-accent)" : "var(--color-border-strong)",
                color: checked ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontWeight: checked ? "600" : "400",
              }}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

