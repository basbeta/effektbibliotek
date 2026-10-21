"use client";

import type { Progress } from "@/lib/case-form";

interface Props {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Completeness shown in the header. Omit for optional blocks. */
  progress?: Progress;
  /** Shown under the title while the card is closed. */
  summary?: string;
  children: React.ReactNode;
}

function ProgressBadge({ progress }: { progress: Progress }) {
  if (progress.complete) {
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded-full"
        style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning-text)" }}
    >
      {progress.done === 0 ? "tom" : `${progress.done} av ${progress.total}`}
    </span>
  );
}

export default function CollapsibleCard({ title, open, onToggle, progress, summary, children }: Props) {
  return (
    <section
      className="rounded-xl"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span aria-hidden className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {open ? "▾" : "▸"}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </span>
          {!open && summary && (
            <span
              className="block text-sm truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              {summary}
            </span>
          )}
        </span>
        {progress && <ProgressBadge progress={progress} />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </section>
  );
}
