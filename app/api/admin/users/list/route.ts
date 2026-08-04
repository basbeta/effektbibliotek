import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Tilgjengelig for alle innloggede brukere, ikke bare admin — brukes også av
// case-eieren selv for å overføre eierskap (CR-025). Returnerer kun navn og
// e-post, ingen admin-følsom data, så åpen tilgang er trygt.
export async function GET() {
  const session = await getSession();
  if (!session.userEmail) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { email: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
