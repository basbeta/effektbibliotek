"use client";

import { useState } from "react";

interface Props {
  caseId: string;
  token: string;
  ownerName: string;
  defaultName?: string;
  defaultEmail?: string;
}

const CHOICES: {
  field: keyof typeof initialChoices;
  label: string;
  isExclusive?: boolean;
  disabledByExclusive?: boolean;
}[] = [
  { field: "ndaRestricted", label: "Casen er NDA-belagt og skal ikke deles med andre", isExclusive: true },
  { field: "anonymizedUseOnly", label: "Casen kan kun brukes anonymisert", isExclusive: true },
  { field: "websiteUseAllowed", label: "Casen kan brukes som case på hjemmeside", disabledByExclusive: true },
  { field: "presentationUseAllowed", label: "Casen kan brukes som case i presentasjoner", disabledByExclusive: true },
  { field: "tenderUseAllowed", label: "Casen kan brukes som case i anbudsbesvarelser", disabledByExclusive: true },
  { field: "competitionUseAllowed", label: "Casen kan brukes som case i konkurranse/award-show", disabledByExclusive: true },
];

const initialChoices = {
  ndaRestricted: false,
  anonymizedUseOnly: false,
  websiteUseAllowed: false,
  presentationUseAllowed: false,
  tenderUseAllowed: false,
  competitionUseAllowed: false,
};

export default function ApprovalForm({ caseId, token, ownerName, defaultName = "", defaultEmail = "" }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [choices, setChoices] = useState(initialChoices);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleChoice(field: keyof typeof choices) {
    const isExclusive = field === "ndaRestricted" || field === "anonymizedUseOnly";
    if (isExclusive) {
      const next = !choices[field];
      setChoices({ ...initialChoices, [field]: next });
    } else {
      setChoices((prev) => ({ ...prev, [field]: !prev[field] }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Navn og e-post er påkrevd.");
      return;
    }

    const anyChoice = Object.values(choices).some(Boolean);
    if (!anyChoice) {
      setError("Du må velge minst ett alternativ.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/godkjenning/${caseId}/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: name,
          submitterEmail: email,
          submitterRole: role || null,
          note: note || null,
          ...choices,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--color-accent-soft)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
          Takk!
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Vi har lagret ditt valg. Du og din kontaktperson ({ownerName}) vil motta en bekreftelse på e-post.
          Ta gjerne kontakt med {ownerName} hvis du har spørsmål.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            Navn <span style={{ color: "var(--color-error-text)" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            E-post <span style={{ color: "var(--color-error-text)" }}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
          Rolle / tittel <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>(valgfritt)</span>
        </label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
        />
      </div>

      <div>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
          Hva godkjenner du? <span style={{ color: "var(--color-error-text)" }}>*</span>
        </p>
        <div className="space-y-3">
          {CHOICES.map(({ field, label, isExclusive, disabledByExclusive }) => {
            const disabled = disabledByExclusive && (choices.ndaRestricted || choices.anonymizedUseOnly);
            const checked = choices[field];
            const isNda = field === "ndaRestricted";
            const isAnonymized = field === "anonymizedUseOnly";
            return (
              <label
                key={field}
                className="flex items-start gap-3 cursor-pointer"
                style={{ opacity: disabled ? 0.4 : 1 }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleChoice(field)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  style={{
                    accentColor: isNda
                      ? "var(--color-nda-bg)"
                      : isAnonymized
                      ? "var(--color-warning-text)"
                      : "var(--color-accent)",
                  }}
                />
                <span
                  className="text-sm"
                  style={{
                    color: isNda ? "var(--color-error-text)" : isAnonymized ? "var(--color-warning-text)" : "var(--color-text-primary)",
                    fontWeight: isExclusive ? "500" : "400",
                  }}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
          Kommentar <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>(valgfritt)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 text-sm rounded-lg outline-none resize-y"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--color-error-text)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        {submitting ? "Lagrer..." : "Lagre valg"}
      </button>
      
    </form>
  );
}
