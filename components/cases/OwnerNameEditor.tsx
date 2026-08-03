"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  name: string;
  canEdit: boolean;
}

export default function OwnerNameEditor({ name, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Kunne ikke lagre.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Noe gikk galt.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditing(false);
                setValue(name);
              }
            }}
            disabled={saving}
            className="text-sm font-semibold px-2 py-1 rounded outline-none"
            style={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-accent)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            {saving ? "…" : "Lagre"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setValue(name);
              setError("");
            }}
            disabled={saving}
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Avbryt
          </button>
        </div>
        {error && (
          <p className="text-xs" style={{ color: "var(--color-error-text)" }}>{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {name}
      </p>
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          aria-label="Endre navn"
          title="Endre navn"
          className="text-xs opacity-60 hover:opacity-100"
          style={{ color: "var(--color-text-muted)" }}
        >
          ✏️
        </button>
      )}
    </div>
  );
}
