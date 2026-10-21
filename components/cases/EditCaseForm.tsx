"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  OPTIONAL_BLOCKS,
  firstIncompleteSection,
  getBlockSummary,
  getBlocksWithContent,
  getSectionProgress,
  getSectionSummary,
  hasExtraEffectDetails,
  type BlockKey,
} from "@/lib/case-form";

import LinksSection from "@/components/cases/LinksSection";
import ApprovalSection from "@/components/cases/ApprovalSection";
import CollapsibleCard from "@/components/cases/CollapsibleCard";
import MultiSelect from "@/components/cases/MultiSelect";

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

  // Which cards are open: only the first section that still has something to
  // fill in. Optional blocks that already hold data are shown, but closed.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const first = firstIncompleteSection(getSectionProgress(form));
    return { basics: first === "basics", classification: first === "classification", content: first === "content" };
  });
  const [visibleBlocks, setVisibleBlocks] = useState<BlockKey[]>(() => getBlocksWithContent(form));
  const [showExtraEffect, setShowExtraEffect] = useState(() => hasExtraEffectDetails(form));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState<{ email: string; name: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const deletePanelRef = useRef<HTMLDivElement>(null);

  // fetch user list for owner-change (available to the owner themselves, not just admin)
  useEffect(() => {
    if (!canManageCase) return;
    fetch("/api/admin/users/list")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAllUsers)
      .catch(() => {});
  }, [canManageCase]);

  useEffect(() => {
    if (!menuOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (confirmDelete) deletePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [confirmDelete]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleCard(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addBlock(key: BlockKey) {
    setVisibleBlocks((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setOpen((prev) => ({ ...prev, [key]: true }));
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
      setOpen((prev) => ({ ...prev, basics: true }));
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

  const progress = getSectionProgress(form);
  const hiddenBlocks = OPTIONAL_BLOCKS.filter((b) => !visibleBlocks.includes(b.key));

  return (
    <form onSubmit={handleSave} className="max-w-3xl">
      <div className="space-y-4 pb-6">
        <CollapsibleCard
          title="Grunninfo"
          open={!!open.basics}
          onToggle={() => toggleCard("basics")}
          progress={progress.basics}
          summary={getSectionSummary("basics", form)}
        >
          <Field label="Kundenavn" htmlFor="field-customerName" required>
            <input id="field-customerName" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Tittel" htmlFor="field-title" required>
            <input id="field-title" value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Beskrivelse" htmlFor="field-summary" required>
            <textarea id="field-summary" value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={4} className={inputCls + " resize-y"} style={inputStyle} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status" htmlFor="field-status">
              <select id="field-status" value={form.lifecycleStatus} onChange={(e) => set("lifecycleStatus", e.target.value)} className={inputCls} style={inputStyle}>
                {Object.entries(lifecycleStatusLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            {canManageCase && allUsers.length > 0 && (
              <Field label="Ansvarlig" htmlFor="field-owner">
                <select id="field-owner" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} className={inputCls} style={inputStyle}>
                  {allUsers.map((u) => (
                    <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Klassifisering"
          open={!!open.classification}
          onToggle={() => toggleCard("classification")}
          progress={progress.classification}
          summary={getSectionSummary("classification", form)}
        >
          <Field label="Bransje" htmlFor="field-industry">
            <select id="field-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">— Ikke satt —</option>
              {Object.entries(industryLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <MultiSelect label="Kanal" options={channelLabels} selected={form.channels} onChange={(next) => set("channels", next)} />
          <MultiSelect label="Case-type" options={caseTypeLabels} selected={form.caseTypes} onChange={(next) => set("caseTypes", next)} />
        </CollapsibleCard>

        <CollapsibleCard
          title="Innhold"
          open={!!open.content}
          onToggle={() => toggleCard("content")}
          progress={progress.content}
          summary={getSectionSummary("content", form)}
        >
          <Field label="Problem / kontekst" htmlFor="field-problem">
            <textarea id="field-problem" value={form.problem} onChange={(e) => set("problem", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
          </Field>
          <Field label="Løsning" htmlFor="field-solution">
            <textarea id="field-solution" value={form.solution} onChange={(e) => set("solution", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
          </Field>
          <Field label="Effekt" htmlFor="field-result">
            <textarea id="field-result" value={form.resultSummary} onChange={(e) => set("resultSummary", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
          </Field>
          <Field label="Læring" htmlFor="field-learning">
            <textarea id="field-learning" value={form.learning} onChange={(e) => set("learning", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} />
          </Field>
        </CollapsibleCard>

        {OPTIONAL_BLOCKS.filter((b) => visibleBlocks.includes(b.key)).map((b) => (
          <CollapsibleCard
            key={b.key}
            title={b.label}
            open={!!open[b.key]}
            onToggle={() => toggleCard(b.key)}
            summary={getBlockSummary(b.key, form)}
          >
            {b.key === "effect" && (
              <>
                <MultiSelect label="Effekttype" options={effectTypeLabels} selected={form.effectTypes} onChange={(next) => set("effectTypes", next)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Hva ble målt" htmlFor="field-effectMetric">
                    <input id="field-effectMetric" value={form.effectMetric} onChange={(e) => set("effectMetric", e.target.value)} className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Resultat" htmlFor="field-resultValue">
                    <input id="field-resultValue" value={form.resultValue} onChange={(e) => set("resultValue", e.target.value)} className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Evidensnivå" htmlFor="field-evidenceLevel">
                    <select id="field-evidenceLevel" value={form.evidenceLevel} onChange={(e) => set("evidenceLevel", e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">— Ikke satt —</option>
                      {Object.entries(evidenceLevelLabels).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExtraEffect((v) => !v)}
                  aria-expanded={showExtraEffect}
                  className="text-sm font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  {showExtraEffect ? "Skjul måledetaljer" : "Flere måledetaljer"}
                </button>
                {showExtraEffect && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Før" htmlFor="field-beforeValue">
                      <input id="field-beforeValue" value={form.beforeValue} onChange={(e) => set("beforeValue", e.target.value)} className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Etter" htmlFor="field-afterValue">
                      <input id="field-afterValue" value={form.afterValue} onChange={(e) => set("afterValue", e.target.value)} className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Periode" htmlFor="field-measurementPeriod">
                      <input id="field-measurementPeriod" value={form.measurementPeriod} onChange={(e) => set("measurementPeriod", e.target.value)} className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Datakilde" htmlFor="field-dataSource">
                      <input id="field-dataSource" value={form.dataSource} onChange={(e) => set("dataSource", e.target.value)} className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                )}
              </>
            )}
            {b.key === "relevance" && (
              <Field label="Relevans" htmlFor="field-relevance">
                <textarea id="field-relevance" value={form.relevance} onChange={(e) => set("relevance", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} placeholder="Hvorfor er denne casen relevant for andre?" />
              </Field>
            )}
            {b.key === "customerFacing" && (
              <Field label="Kundevennlig beskrivelse" htmlFor="field-customerFacing">
                <textarea id="field-customerFacing" value={form.customerFacingSummary} onChange={(e) => set("customerFacingSummary", e.target.value)} rows={4} className={inputCls + " resize-y"} style={inputStyle} placeholder="Trygg tekst som kan vises til kunden" />
              </Field>
            )}
            {b.key === "internalNotes" && (
              <Field label="Interne notater" htmlFor="field-internalNotes">
                <textarea id="field-internalNotes" value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} rows={3} className={inputCls + " resize-y"} style={inputStyle} placeholder="Vises aldri til kunder" />
              </Field>
            )}
          </CollapsibleCard>
        ))}

        {hiddenBlocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Legg til flere felt">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Legg til:</span>
            {hiddenBlocks.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => addBlock(b.key)}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px dashed var(--color-border-strong)",
                  color: "var(--color-text-secondary)",
                }}
              >
                + {b.label}
              </button>
            ))}
          </div>
        )}

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

        <LinksSection caseId={initial.id} links={links ?? []} files={files ?? []} canManage={true} />

        {canManageCase && confirmDelete && (
          <div
            ref={deletePanelRef}
            role="alertdialog"
            aria-label="Bekreft sletting av case"
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
        )}
      </div>

      <div
        className="sticky bottom-0 z-10 flex items-center gap-3 px-1 py-3"
        style={{
          backgroundColor: "var(--color-background)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
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

        {error && (
          <p role="alert" className="text-sm flex-1" style={{ color: "var(--color-error-text)" }}>
            {error}
          </p>
        )}

        {canManageCase && (
          <div ref={menuRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Flere handlinger"
              className="px-3 py-2 text-lg leading-none rounded-lg"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border-strong)",
                color: "var(--color-text-secondary)",
              }}
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-2 w-72 rounded-lg py-1 text-sm"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border-strong)",
                }}
              >
                <a
                  role="menuitem"
                  href={`/api/cases/${initial.id}/export`}
                  className="block px-4 py-2"
                  style={{ color: "var(--color-text-primary)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  Eksporter alt innhold (tekst, lenker, godkjenninger)
                </a>
                <button
                  role="menuitem"
                  type="button"
                  className="block w-full text-left px-4 py-2 font-medium"
                  style={{ color: "var(--color-error-text)" }}
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  Slett case …
                </button>
              </div>
            )}
          </div>
        )}
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

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
        {label}
        {required && <span style={{ color: "var(--color-error-text)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}
