"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NyCasePage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);

  // Autocomplete from existing customers; the field works fine without it.
  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then((names) => Array.isArray(names) && setCustomerSuggestions(names))
      .catch(() => {});
  }, []);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerName.trim() || !title.trim() || !summary.trim()) {
      setError("Alle tre feltene må fylles ut.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, title, summary }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }

      const newCase = await res.json();
      router.push(`/case/${newCase.id}`);
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href="/bibliotek"
          className="text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← Bibliotek
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
        Legg inn ny case
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Start med det viktigste. Du kan legge til mer informasjon etterpå.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            Kundenavn <span style={{ color: "var(--color-error-text)" }}>*</span>
          </label>
          <input
            type="text"
            list="customer-suggestions"
            autoComplete="off"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="F.eks. Posten Norge"
            className="w-full px-4 py-2.5 text-sm rounded-lg outline-none"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-primary)",
            }}
            autoFocus
          />
          <datalist id="customer-suggestions">
            {customerSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            Tittel <span style={{ color: "var(--color-error-text)" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kort, beskrivende tittel på casen (kan endres)"
            className="w-full px-4 py-2.5 text-sm rounded-lg outline-none"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            Beskrivelse <span style={{ color: "var(--color-error-text)" }}>*</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Hva handler casen om? Hva skal testes?"
            rows={4}
            className="w-full px-4 py-2.5 text-sm rounded-lg outline-none resize-y"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--color-error-text)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {submitting ? "Oppretter..." : "Opprett case"}
          </button>
          <Link
            href="/bibliotek"
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
    </div>
  );
}
