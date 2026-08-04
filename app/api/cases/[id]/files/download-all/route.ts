import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCaseFileBuffer } from "@/lib/storage";

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

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const file of files) {
    const buffer = await getCaseFileBuffer(file.storageKey);
    let name = file.filename;
    if (usedNames.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      name = `${base}-${file.id}${ext}`;
    }
    usedNames.add(name);
    zip.file(name, buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const zipFilename = `materiale-${c.customerName}-${c.title}`
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename || "materiale"}.zip"`,
    },
  });
}
