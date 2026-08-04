import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCaseExportText } from "@/lib/case-export";
import { buildCaseZip, slugifyForFilename } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
      links: { orderBy: { createdAt: "asc" } },
      files: { orderBy: { createdAt: "asc" } },
      usageApprovals: { orderBy: { submittedAt: "asc" } },
    },
  });

  if (!c) {
    return NextResponse.json({ error: "Case ikke funnet" }, { status: 404 });
  }

  const text = buildCaseExportText({
    ...c,
    ownerName: c.owner.name,
    ownerEmail: c.owner.email,
    createdByName: c.createdBy.name,
  });

  const slug = slugifyForFilename(`case-${c.customerName}-${c.title}`) || "case";

  const zipBuffer = await buildCaseZip(
    [{ filename: `${slug}.txt`, content: text }],
    c.files
  );

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
    },
  });
}
