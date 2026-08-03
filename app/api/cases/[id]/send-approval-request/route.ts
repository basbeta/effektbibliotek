import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendUsageApprovalRequest } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const approverName = (body.approverName ?? "").trim();
  const approverEmail = (body.approverEmail ?? "").toLowerCase().trim();

  if (!approverName) {
    return NextResponse.json({ error: "Navn på godkjenner mangler." }, { status: 400 });
  }
  if (!approverEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail)) {
    return NextResponse.json({ error: "Bruk en gyldig e-postadresse." }, { status: 400 });
  }

  const c = await prisma.case.findUnique({
    where: { id },
    include: { owner: { select: { name: true, email: true } } },
  });

  if (!c) {
    return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });
  }

  if (c.ownerEmail !== session.userEmail && !session.isAdmin) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  if (!c.usageApprovalToken) {
    return NextResponse.json({ error: "Mangler godkjenningstoken" }, { status: 500 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    await sendUsageApprovalRequest({
      approverName,
      approverEmail,
      ownerName: c.owner.name,
      ownerEmail: c.owner.email,
      caseTitle: c.title,
      caseId: c.id,
      token: c.usageApprovalToken,
      appUrl,
    });

    await prisma.case.update({
      where: { id },
      data: {
        approverName,
        approverEmail,
        usageApprovalStatus: c.usageApprovalStatus === "not_requested" ? "open" : c.usageApprovalStatus,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("send-approval-request failed:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Klarte ikke å sende godkjenningsforespørsel. Prøv igjen om litt." },
      { status: 500 }
    );
  }
}
