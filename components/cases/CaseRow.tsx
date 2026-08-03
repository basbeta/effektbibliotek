import Link from "next/link";
import StatusBadge from "./StatusBadge";
import UsageBadge from "./UsageBadge";
import { formatRelativeDate } from "@/lib/format";

export interface CaseRowData {
  id: string;
  customerName: string;
  title: string;
  lifecycleStatus: string;
  ndaRestricted: boolean;
  anonymizedUseOnly: boolean;
  websiteUseAllowed: boolean;
  presentationUseAllowed: boolean;
  tenderUseAllowed: boolean;
  competitionUseAllowed: boolean;
  missing: string[];
  updatedAt: string | Date;
  owner?: { name: string };
}

export default function CaseRow({ c, showOwner }: { c: CaseRowData; showOwner?: boolean }) {
  return (
    <div
      className="flex items-start justify-between gap-4 px-4 py-3 rounded-lg"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {c.ndaRestricted && (
            <span
              className="px-1.5 py-0.5 text-xs font-semibold rounded"
              style={{ backgroundColor: "var(--color-nda-bg)", color: "var(--color-nda-text)" }}
            >
              NDA
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {c.customerName}
          </span>
        </div>
        <Link
          href={`/case/${c.id}`}
          className="text-sm font-medium hover:underline block truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {c.title}
        </Link>
        {c.missing.length > 0 && (
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Mangler: {c.missing.join(" · ")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
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
        {showOwner && c.owner && (
          <span className="text-xs hidden sm:block" style={{ color: "var(--color-text-muted)" }}>
            {c.owner.name}
          </span>
        )}
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
          {formatRelativeDate(c.updatedAt)}
        </span>
        <Link
          href={`/case/${c.id}/rediger`}
          className="text-xs px-2.5 py-1 rounded"
          style={{
            backgroundColor: "var(--color-surface-muted)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-secondary)",
          }}
        >
          Rediger
        </Link>
      </div>
    </div>
  );
}
