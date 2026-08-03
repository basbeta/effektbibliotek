import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }
  return NextResponse.json({
    email: session.userEmail,
    name: session.userName,
    isAdmin: session.isAdmin,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Navn kan ikke være tomt." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { email: session.userEmail },
      data: { name },
    });

    session.userName = name;
    await session.save();

    return NextResponse.json({ ok: true, name });
  } catch (error) {
    console.error("update name failed:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: "Klarte ikke å oppdatere navn." }, { status: 500 });
  }
}
