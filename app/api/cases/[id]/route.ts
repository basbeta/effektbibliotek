import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      links: true,
      usageApprovals: { orderBy: { submittedAt: "desc" } },
    },
  });

  if (!caseData) {
    return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });
  }

  return NextResponse.json(caseData);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.case.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });
  }

  if (existing.ownerEmail !== session.userEmail && !session.isAdmin) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const body = await request.json();

  const allowed = [
    "customerName",
    "title",
    "summary",
    "customerFacingSummary",
    "lifecycleStatus",
    "industry",
    "caseTypes",
    "channels",
    "effectTypes",
    "tags",
    "problem",
    "solution",
    "resultSummary",
    "learning",
    "relevance",
    "pitchText",
    "internalNotes",
    "effectMetric",
    "beforeValue",
    "afterValue",
    "resultValue",
    "measurementPeriod",
    "dataSource",
    "evidenceLevel",
    "ndaRestricted",
    "anonymizedUseOnly",
    "websiteUseAllowed",
    "presentationUseAllowed",
    "tenderUseAllowed",
    "competitionUseAllowed",
    "ownerEmail",
  ] as const;

  const updateData: Record<string, unknown> = { updatedByEmail: session.userEmail };
  for (const key of allowed) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const updated = await prisma.case.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}
