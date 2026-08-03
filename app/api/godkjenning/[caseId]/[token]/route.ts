import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeUsageLevel, choiceLabels, type ApprovalChoices } from "@/lib/usage-approval";
import { sendUsageApprovalConfirmation, sendUsageApprovalCopyToBas } from "@/lib/email";

type RouteContext = { params: Promise<{ caseId: string; token: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { caseId, token } = await params;

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: { owner: { select: { name: true, email: true } } },
  });

  if (!c || c.usageApprovalToken !== token) {
    return NextResponse.json({ error: "Lenken er ikke gyldig" }, { status: 404 });
  }

  if (c.usageApprovalStatus !== "open") {
    return NextResponse.json({ error: "Denne lenken er ikke lenger aktiv" }, { status: 409 });
  }

  const body = await request.json();
  const { submitterName, submitterEmail, submitterRole, note, ...choiceFields } = body;

  if (!submitterName?.trim() || !submitterEmail?.trim()) {
    return NextResponse.json({ error: "Navn og e-post er påkrevd" }, { status: 400 });
  }

  const choices: ApprovalChoices = {
    ndaRestricted: !!choiceFields.ndaRestricted,
    internalUseAllowed: !!choiceFields.internalUseAllowed,
    anonymizedUseOnly: !!choiceFields.anonymizedUseOnly,
    presentationUseAllowed: !!choiceFields.presentationUseAllowed,
    competitionUseAllowed: !!choiceFields.competitionUseAllowed,
  };

  const anyChoice = Object.values(choices).some(Boolean);
  if (!anyChoice) {
    return NextResponse.json({ error: "Minst ett valg er påkrevd" }, { status: 400 });
  }

  const computed = computeUsageLevel(choices);
  const now = new Date();

  await prisma.$transaction([
    prisma.usageApproval.create({
      data: {
        caseId,
        submittedAt: now,
        submittedByName: submitterName.trim(),
        submittedByEmail: submitterEmail.trim(),
        submittedByRole: submitterRole?.trim() || null,
        note: note?.trim() || null,
        lockedAt: now,
        ...choices,
      },
    }),
    prisma.case.update({
      where: { id: caseId },
      data: {
        usageApprovalStatus: "submitted_locked",
        usageLevel: computed.usageLevel,
        ndaRestricted: computed.ndaRestricted,
        anonymizedUseOnly: computed.anonymizedUseOnly,
        competitionUseAllowed: computed.competitionUseAllowed,
      },
    }),
  ]);

  const selectedChoiceLabels = (Object.keys(choices) as (keyof ApprovalChoices)[])
    .filter((k) => choices[k])
    .map((k) => choiceLabels[k]);

  const emailParams = {
    customerName: c.customerName,
    caseTitle: c.title,
    ownerName: c.owner.name,
    ownerEmail: c.owner.email,
    choices: selectedChoiceLabels,
    note: note?.trim() || null,
    submitterName: submitterName.trim(),
    submitterEmail: submitterEmail.trim(),
    submitterRole: submitterRole?.trim() || null,
    submittedAt: now,
  };

  await Promise.allSettled([
    sendUsageApprovalConfirmation({ to: submitterEmail.trim(), ...emailParams }),
    sendUsageApprovalCopyToBas({ caseId, ...emailParams }),
  ]);

  return NextResponse.json({ ok: true });
}
