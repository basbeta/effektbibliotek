import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCaseFile, getCaseFileDownloadUrl } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id, fileId } = await params;

  const file = await prisma.caseFile.findUnique({ where: { id: fileId } });
  if (!file || file.caseId !== id) {
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  const url = await getCaseFileDownloadUrl(file.storageKey, file.filename);
  return NextResponse.redirect(url);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id, fileId } = await params;

  const c = await prisma.case.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });

  if (c.ownerEmail !== session.userEmail && !session.isAdmin) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const file = await prisma.caseFile.findUnique({ where: { id: fileId } });
  if (!file || file.caseId !== id) {
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  await deleteCaseFile(file.storageKey);
  await prisma.caseFile.delete({ where: { id: fileId } });

  return NextResponse.json({ ok: true });
}
