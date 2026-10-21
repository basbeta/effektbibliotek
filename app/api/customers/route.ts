import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Distinct customer names from existing cases, used for autocomplete on "Ny case".
 * Same visibility as the library: any logged-in user.
 */
export async function GET() {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const rows = await prisma.case.findMany({
    select: { customerName: true },
    distinct: ["customerName"],
    orderBy: { customerName: "asc" },
  });

  const names = Array.from(
    new Set(rows.map((r: { customerName: string }) => r.customerName.trim()).filter(Boolean))
  );
  return NextResponse.json(names);
}
