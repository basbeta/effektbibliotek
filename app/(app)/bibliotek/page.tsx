"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CaseCard, { type CaseCardData } from "@/components/cases/CaseCard";
import Link from "next/link";

const statusOptions = [
  { value: "", label: "Alle statuser" },
  { value: "started", label: "Påbegynt" },
  { value: "ongoing", label: "Pågår" },
  { value: "completed", label: "Ferdigstilt" },
];

const usageOptions = [
  { value: "", label: "Alle bruksområder" },
  { value: "not_cleared", label: "Ikke avklart" },
  { value: "nda", label: "NDA" },
  { value: "anonymized", label: "Kun anonymisert" },
  { value: "website", label: "Hjemmeside" },
  { value: "presentation", label: "Presentasjoner" },
  { value: "tender", label: "Anbudsbesvarelser" },
  { value: "competition", label: "Konkurranse/award-show" },
];

export default function BibliotekPage() {
  const [cases, setCases] = useState<CaseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [usage, setUsage] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCases = useCallback(async (q: string, s: string, u: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (s) params.set("status", s);
    if (u) params.set("usage", u);

    const res = await fetch(`/api/cases?${params.toString()}`);
    if (res.ok) {
      setCases(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCases(query, status, usage), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, status, usage, fetchCases]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Bibliotek
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Finn caser, tester og dokumentert læring fra Bas.
        </p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Søk i caser..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 text-sm rounded-lg outline-none"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-primary)",
          }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-secondary)",
          }}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={usage}
          onChange={(e) => setUsage(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-secondary)",
          }}
        >
          {usageOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
          Laster...
        </div>
      ) : cases.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <p className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
            {query || status || usage ? "Ingen caser matcher søket" : "Biblioteket er tomt"}
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            {query || status || usage
              ? "Prøv et annet søk eller fjern filtrene."
              : "Ikke ferdig er bedre enn ikke registrert. Legg inn din første case."}
          </p>
          {!query && !status && !usage && (
            <Link
              href="/case/ny"
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              Legg inn første case
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
