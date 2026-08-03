import Link from "next/link";
import StatusBadge from "./StatusBadge";
import UsageBadge from "./UsageBadge";
import { industryLabels, channelLabels, caseTypeLabels } from "@/lib/labels";
import { formatRelativeDate } from "@/lib/format";

export interface CaseCardData {
  id: string;
  customerName: string;
  title: string;
  summary: string;
  lifecycleStatus: string;
  ndaRestricted: boolean;
  anonymizedUseOnly: boolean;
  websiteUseAllowed: boolean;
  presentationUseAllowed: boolean;
  tenderUseAllowed: boolean;
  competitionUseAllowed: boolean;
  industry: string | null;
  caseTypes: string[];
  channels: string[];
  learning: string | null;
  resultSummary: string | null;
  owner: { name: string; email: string };
  updatedAt: string | Date;
}

export default function CaseCard({ c }: { c: CaseCardData }) {
  const metaChips: string[] = [];
  if (c.industry) metaChips.push(industryLabels[c.industry as keyof typeof industryLabels] ?? c.industry);
  c.channels.slice(0, 2).forEach((ch) => {
    metaChips.push(channelLabels[ch as keyof typeof channelLabels] ?? ch);
  });
  c.caseTypes.slice(0, 1).forEach((ct) => {
    metaChips.push(caseTypeLabels[ct as keyof typeof caseTypeLabels] ?? ct);
  });

  const effectPreview = c.resultSummary || c.learning;

  return (
    <Link
      href={`/case/${c.id}`}
      className="block rounded-xl p-5 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {c.ndaRestricted && (
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold mb-3"
          style={{ backgroundColor: "var(--color-nda-bg)", color: "var(--color-nda-text)" }}
        >
          NDA / Skal ikke deles
        </div>
      )}

      <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
        {c.customerName}
      </p>
      <h3 className="font-semibold text-base leading-snug mb-2" style={{ color: "var(--color-text-primary)" }}>
        {c.title}
      </h3>
      <p
        className="text-sm mb-3 line-clamp-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {c.summary}
      </p>

      {metaChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {metaChips.map((chip) => (
            <span
              key={chip}
              className="px-2 py-0.5 text-xs rounded"
              style={{
                backgroundColor: "var(--color-surface-muted)",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {effectPreview && (
        <p className="text-xs italic mb-3 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
          {effectPreview}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={c.lifecycleStatus} />
          <UsageBadge
            ndaRestricted={c.ndaRestricted}
            anonymizedUseOnly={c.anonymizedUseOnly}
            websiteUseAllowed={c.websiteUseAllowed}
            presentationUseAllowed={c.presentationUseAllowed}
            tenderUseAllowed={c.tenderUseAllowed}
            competitionUseAllowed={c.competitionUseAllowed}
          />
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {c.owner.name}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {formatRelativeDate(c.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
