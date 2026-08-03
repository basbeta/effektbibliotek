interface UsageBadgeProps {
  ndaRestricted: boolean;
  anonymizedUseOnly: boolean;
  websiteUseAllowed: boolean;
  presentationUseAllowed: boolean;
  tenderUseAllowed: boolean;
  competitionUseAllowed: boolean;
}

const USE_BADGES: { field: keyof Omit<UsageBadgeProps, "ndaRestricted" | "anonymizedUseOnly">; label: string }[] = [
  { field: "websiteUseAllowed", label: "Hjemmeside" },
  { field: "presentationUseAllowed", label: "Presentasjoner" },
  { field: "tenderUseAllowed", label: "Anbud" },
  { field: "competitionUseAllowed", label: "Konkurranse" },
];

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-medium rounded"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

// NDA is not rendered here — callers already show it with dedicated,
// more prominent styling elsewhere on the page.
export default function UsageBadge(props: UsageBadgeProps) {
  if (props.ndaRestricted) return null;

  if (props.anonymizedUseOnly) {
    return <Badge label="Kun anonymisert" bg="var(--color-warning-bg)" text="var(--color-warning-text)" />;
  }

  const allowed = USE_BADGES.filter((u) => props[u.field]);

  if (allowed.length === 0) {
    return <Badge label="Ikke avklart" bg="var(--color-usage-unclear-bg)" text="var(--color-usage-unclear-text)" />;
  }

  return (
    <>
      {allowed.map((u) => (
        <Badge key={u.field} label={u.label} bg="var(--color-usage-presentation-bg)" text="var(--color-usage-presentation-text)" />
      ))}
    </>
  );
}
