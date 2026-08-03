import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import EditCaseForm from "@/components/cases/EditCaseForm";

type Props = { params: Promise<{ id: string }> };

export default async function RedigerCasePage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      links: { orderBy: { createdAt: "asc" } },
      usageApprovals: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });
  if (!c) notFound();

  if (c.ownerEmail !== session.userEmail && !session.isAdmin) {
    redirect(`/case/${id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link href={`/case/${id}`} className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          ← Tilbake til case
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Rediger case
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        {c.customerName} — {c.title}
      </p>

      <EditCaseForm
        initial={c}
        isAdmin={session.isAdmin}
        links={c.links}
        usageApprovalStatus={c.usageApprovalStatus}
        lastApproval={c.usageApprovals[0] ?? null}
      />
    </div>
  );
}
