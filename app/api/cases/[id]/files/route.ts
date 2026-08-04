import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadCaseFile, isAllowedCaseFileType, MAX_CASE_FILES_TOTAL_BYTES } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const c = await prisma.case.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });

  if (c.ownerEmail !== session.userEmail && !session.isAdmin) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil mottatt" }, { status: 400 });
  }

  if (!isAllowedCaseFileType(file.name, file.type)) {
    return NextResponse.json(
      { error: "Filtypen er ikke tillatt. Godkjente typer: jpg, png, webp, gif, pdf, doc, docx." },
      { status: 400 }
    );
  }

  const existing = await prisma.caseFile.aggregate({
    where: { caseId: id },
    _sum: { sizeBytes: true },
  });
  const currentTotal = existing._sum.sizeBytes ?? 0;
  if (currentTotal + file.size > MAX_CASE_FILES_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "Denne casen har nådd maksgrensen på 100MB totalt for opplastede filer." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storageKey } = await uploadCaseFile(id, file.name, buffer, file.type);

  const caseFile = await prisma.caseFile.create({
    data: {
      caseId: id,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      createdByEmail: session.userEmail,
    },
  });

  return NextResponse.json(caseFile, { status: 201 });
}
