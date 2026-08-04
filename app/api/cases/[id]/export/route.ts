import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCaseExportText } from "@/lib/case-export";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
      links: { orderBy: { createdAt: "asc" } },
      usageApprovals: { orderBy: { submittedAt: "asc" } },
    },
  });

  if (!c) {
    return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });
  }

  const text = buildCaseExportText({
    ...c,
    ownerName: c.owner.name,
    ownerEmail: c.owner.email,
    createdByName: c.createdBy.name,
  });

  const filename = `case-${c.customerName}-${c.title}`
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename || "case"}.txt"`,
    },
  });
}
