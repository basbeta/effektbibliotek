import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCaseZip, slugifyForFilename } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const c = await prisma.case.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });

  const files = await prisma.caseFile.findMany({
    where: { caseId: id },
    orderBy: { createdAt: "asc" },
  });
  if (files.length === 0) {
    return NextResponse.json({ error: "Ingen filer å laste ned" }, { status: 404 });
  }

  const zipBuffer = await buildCaseZip([], files);
  const slug = slugifyForFilename(`materiale-${c.customerName}-${c.title}`) || "materiale";

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
    },
  });
}
