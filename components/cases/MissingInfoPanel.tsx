"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { channelLabels, caseTypeLabels, industryLabels } from "@/lib/labels";
import type { MissingId, MissingItem } from "@/lib/cases";
import {
  buildMissingPatch,
  canSaveMissing,
  emptyMissingDraft,
  isEditableMissing,
  type EditableMissingId,
  type MissingDraft,
} from "@/lib/missing-fields";
import MultiSelect from "@/components/cases/MultiSelect";

interface Props {
  caseId: string;
  /** Only the owner and admins can edit; everyone else sees plain chips. */
  canEdit: boolean;
  forCompleted: MissingItem[];
  forPresentation: MissingItem[];
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg outline-none";
const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border-strong)",
  color: "var(--color-text-primary)",
};

/** Placeholder hints shown in the text editors. */
const TEXT_PLACEHOLDERS: Partial<Record<MissingId, string>> = {
  problem: "Hva var utgangspunktet eller utfordringen?",
  solution: "Hva ble gjort?",
  customerFacingSummary: "Trygg tekst som kan vises til kunden",
};

export default function MissingInfoPanel({ caseId, canEdit, forCompleted, forPresentation }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<EditableMissingId | null>(null);
  const [draft, setDraft] = useState<MissingDraft>(emptyMissingDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Move focus into the editor when it opens.
  useEffect(() => {
    if (!active) return;
    const el = editorRef.current?.querySelector<HTMLElement>("textarea, select, input");
    el?.focus();
  }, [active]);

  if (forCompleted.length === 0 && forPresentation.length === 0) return null;

  function open(id: EditableMissingId) {
    setDraft(emptyMissingDraft());
    setError("");
    setActive(id);
  }

  function close() {
    setActive(null);
    setError("");
  }

  function set<K extends keyof MissingDraft>(key: K, value: MissingDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!active) return;
    const patch = buildMissingPatch(active, draft);
    if (!patch) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          res.status === 403
            ? "Du har ikke tilgang til å redigere denne casen."
            : (data.error ?? "Kunne ikke lagre. Prøv igjen.")
        );
        return;
      }
      setActive(null);
      router.refresh();
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  function renderGroup(title: string, items: MissingItem[]) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
          {title}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) =>
            canEdit && isEditableMissing(item.id) ? (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item.id as EditableMissingId)}
                aria-expanded={active === item.id}
                className="px-2 py-0.5 text-xs rounded cursor-pointer underline decoration-dotted underline-offset-2"
                style={{
                  backgroundColor: "var(--color-warning-bg)",
                  color: "var(--color-warning-text)",
                  outline: active === item.id ? "2px solid var(--color-accent)" : undefined,
                }}
              >
                + {item.label}
              </button>
            ) : (
              <span
                key={item.id}
                className="px-2 py-0.5 text-xs rounded"
                style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning-text)" }}
              >
                {item.label}
              </span>
            )
          )}
        </div>
      </div>
    );
  }

  const label =
    [...forCompleted, ...forPresentation].find((i) => i.id === active)?.label ?? "";

  return (
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
        {renderGroup("For å sette Ferdigstilt:", forCompleted)}
        {renderGroup("For bruk i presentasjoner:", forPresentation)}
      </div>

      {canEdit && active && (
        <div
          ref={editorRef}
          role="group"
          aria-label={`Fyll ut: ${label}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="mt-4 rounded-lg p-4 space-y-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {label}
          </p>

          {active === "industry" && (
            <select
              aria-label="Bransje"
              value={draft.industry}
              onChange={(e) => set("industry", e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">— Velg bransje —</option>
              {Object.entries(industryLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}

          {active === "channels" && (
            <MultiSelect
              label="Kanal"
              options={channelLabels}
              selected={draft.channels}
              onChange={(next) => set("channels", next)}
            />
          )}

          {active === "caseTypes" && (
            <MultiSelect
              label="Case-type"
              options={caseTypeLabels}
              selected={draft.caseTypes}
              onChange={(next) => set("caseTypes", next)}
            />
          )}

          {(active === "problem" || active === "solution" || active === "customerFacingSummary") && (
            <textarea
              aria-label={label}
              value={draft[active]}
              onChange={(e) => set(active, e.target.value)}
              rows={4}
              placeholder={TEXT_PLACEHOLDERS[active]}
              className={inputCls + " resize-y"}
              style={inputStyle}
            />
          )}

          {active === "effectOrLearning" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Effekt
                </label>
                <textarea
                  aria-label="Effekt"
                  value={draft.resultSummary}
                  onChange={(e) => set("resultSummary", e.target.value)}
                  rows={3}
                  className={inputCls + " resize-y"}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Læring
                </label>
                <textarea
                  aria-label="Læring"
                  value={draft.learning}
                  onChange={(e) => set("learning", e.target.value)}
                  rows={3}
                  className={inputCls + " resize-y"}
                  style={inputStyle}
                />
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Det holder å fylle ut én av dem.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--color-error-text)" }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving || !canSaveMissing(active, draft)}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {saving ? "Lagrer..." : "Lagre"}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded-lg"
              style={{
                border: "1px solid var(--color-border-strong)",
                color: "var(--color-text-secondary)",
              }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
