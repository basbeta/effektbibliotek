import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp, isBasEmail, nameFromEmail } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

// Simple in-memory rate limit: 5 requests per minute per email
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email ?? "").toLowerCase().trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Bruk en gyldig Bas-epostadresse." },
      { status: 400 }
    );
  }

  if (!isBasEmail(email)) {
    return NextResponse.json(
      { error: "Effektbiblioteket er foreløpig bare tilgjengelig for Bas-epostadresser." },
      { status: 400 }
    );
  }

  if (!checkRateLimit(email)) {
    return NextResponse.json(
      { error: "For mange forsøk. Prøv igjen om ett minutt." },
      { status: 429 }
    );
  }

  try {
    const otp = generateOtp();
    const codeHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpCode.create({ data: { email, codeHash, expiresAt } });

    // Ensure user exists
    const name = nameFromEmail(email);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name },
    });

    await sendOtpEmail(email, otp);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("request-code failed:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Klarte ikke å sende engangskode. Prøv igjen om litt." },
      { status: 500 }
    );
  }
}
