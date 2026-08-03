import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  CaseLifecycleStatus,
  Industry,
  Channel,
} from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") as CaseLifecycleStatus | null;
  const usage = searchParams.get("usage");
  const industry = searchParams.get("industry") as Industry | null;
  const channel = searchParams.get("channel") as Channel | null;

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { problem: { contains: q, mode: "insensitive" } },
      { solution: { contains: q, mode: "insensitive" } },
      { resultSummary: { contains: q, mode: "insensitive" } },
      { learning: { contains: q, mode: "insensitive" } },
      { pitchText: { contains: q, mode: "insensitive" } },
    ];
  }

  if (status) where.lifecycleStatus = status;
  if (usage === "nda") where.ndaRestricted = true;
  else if (usage === "anonymized") where.anonymizedUseOnly = true;
  else if (usage === "website") where.websiteUseAllowed = true;
  else if (usage === "presentation") where.presentationUseAllowed = true;
  else if (usage === "tender") where.tenderUseAllowed = true;
  else if (usage === "competition") where.competitionUseAllowed = true;
  else if (usage === "not_cleared") {
    where.ndaRestricted = false;
    where.anonymizedUseOnly = false;
    where.websiteUseAllowed = false;
    where.presentationUseAllowed = false;
    where.tenderUseAllowed = false;
    where.competitionUseAllowed = false;
  }
  if (industry) where.industry = industry;
  if (channel) where.channels = { has: channel };

  const cases = await prisma.case.findMany({
    where,
    include: {
      owner: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const body = await request.json();
  const { customerName, title, summary } = body;

  if (!customerName?.trim() || !title?.trim() || !summary?.trim()) {
    return NextResponse.json(
      { error: "Kundenavn, tittel og beskrivelse er påkrevd" },
      { status: 400 }
    );
  }

  const newCase = await prisma.case.create({
    data: {
      customerName: customerName.trim(),
      title: title.trim(),
      summary: summary.trim(),
      ownerEmail: session.userEmail,
      createdByEmail: session.userEmail,
    },
  });

  return NextResponse.json(newCase, { status: 201 });
}
