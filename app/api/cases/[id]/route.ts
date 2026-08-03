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

  const usageRightsFields = [
    "ndaRestricted",
    "anonymizedUseOnly",
    "websiteUseAllowed",
    "presentationUseAllowed",
    "tenderUseAllowed",
    "competitionUseAllowed",
  ] as const;

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
    ...usageRightsFields,
    "ownerEmail",
  ] as const;

  // Bruksrettigheter reflekterer et faktisk kundesamtykke og skal ikke kunne
  // overstyres via API-et etter at godkjenningen er låst (se CR-021) — kun
  // via "lås opp"-flyten på case-siden, som selv nullstiller status.
  const usageRightsLocked = existing.usageApprovalStatus === "submitted_locked";

  const updateData: Record<string, unknown> = { updatedByEmail: session.userEmail };
  for (const key of allowed) {
    if (usageRightsLocked && (usageRightsFields as readonly string[]).includes(key)) continue;
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const updated = await prisma.case.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}
