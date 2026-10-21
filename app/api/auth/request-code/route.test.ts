import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  otpCode: { create: vi.fn() },
  user: { upsert: vi.fn() },
}));
const sendOtpEmailMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => ({ sendOtpEmail: sendOtpEmailMock }));
vi.mock("@sentry/nextjs", () => ({ captureException: captureExceptionMock }));

import { POST } from "@/app/api/auth/request-code/route";
import { verifyOtp } from "@/lib/auth";

// The route keeps its rate-limit counters in module memory, so every test uses
// its own e-mail address unless it is explicitly testing the limit.
let counter = 0;
function freshEmail() {
  counter += 1;
  return `bruker${counter}@bas.no`;
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/request-code", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.otpCode.create.mockResolvedValue({});
  db.user.upsert.mockResolvedValue({});
  sendOtpEmailMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/auth/request-code", () => {
  describe("e-mail validation", () => {
    it.each([
      ["no body", "not json"],
      ["missing e-mail", {}],
      ["not an address", { email: "ikke-en-adresse" }],
      ["address with two @ signs", { email: "a@evil.example.com@bas.no" }],
      ["address with whitespace inside", { email: "a b@bas.no" }],
    ])("should return 400 for %s", async (_label, body) => {
      const res = await POST(request(body));
      expect(res.status).toBe(400);
      expect(db.otpCode.create).not.toHaveBeenCalled();
      expect(sendOtpEmailMock).not.toHaveBeenCalled();
    });

    it.each(["bruker@gmail.com", "bruker@bas.no.example.com", "bruker@xbas.no"])(
      "should return 400 for the non-Bas address %s",
      async (email) => {
        const res = await POST(request({ email }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/Bas-epostadresser/);
        expect(db.otpCode.create).not.toHaveBeenCalled();
        expect(sendOtpEmailMock).not.toHaveBeenCalled();
      }
    );
  });

  describe("sending a code", () => {
    it("should store a hashed code and e-mail the plain code to the user", async () => {
      const email = freshEmail();
      const res = await POST(request({ email }));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      const [to, otp] = sendOtpEmailMock.mock.calls[0];
      expect(to).toBe(email);
      expect(otp).toMatch(/^\d{6}$/);

      const stored = db.otpCode.create.mock.calls[0][0].data;
      expect(stored.email).toBe(email);
      expect(stored.codeHash).not.toBe(otp);
      expect(await verifyOtp(otp, stored.codeHash)).toBe(true);
    });

    it("should make the code expire after five minutes", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      await POST(request({ email: freshEmail() }));
      const { expiresAt } = db.otpCode.create.mock.calls[0][0].data;
      expect(expiresAt.getTime()).toBe(new Date("2026-10-20T12:05:00Z").getTime());
    });

    it("should normalise the address to lower case and trim whitespace", async () => {
      const email = freshEmail();
      await POST(request({ email: `  ${email.toUpperCase()}  ` }));
      expect(db.otpCode.create.mock.calls[0][0].data.email).toBe(email);
      expect(sendOtpEmailMock.mock.calls[0][0]).toBe(email);
    });

    it("should create the user on first login with a name derived from the address", async () => {
      await POST(request({ email: "test.bruker@bas.no" }));
      expect(db.user.upsert).toHaveBeenCalledWith({
        where: { email: "test.bruker@bas.no" },
        update: {},
        create: { email: "test.bruker@bas.no", name: "Test Bruker" },
      });
    });
  });

  describe("rate limit", () => {
    it("should allow five requests per minute per address and reject the sixth with 429", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      const email = freshEmail();

      for (let i = 0; i < 5; i++) {
        expect((await POST(request({ email }))).status).toBe(200);
      }
      const sixth = await POST(request({ email }));
      expect(sixth.status).toBe(429);
      expect((await sixth.json()).error).toMatch(/For mange forsøk/);
      expect(sendOtpEmailMock).toHaveBeenCalledTimes(5);
    });

    it("should count each address separately", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      const blocked = freshEmail();
      const other = freshEmail();
      for (let i = 0; i < 6; i++) await POST(request({ email: blocked }));

      expect((await POST(request({ email: blocked }))).status).toBe(429);
      expect((await POST(request({ email: other }))).status).toBe(200);
    });

    it("should accept requests again once the minute has passed", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      const email = freshEmail();
      for (let i = 0; i < 6; i++) await POST(request({ email }));
      expect((await POST(request({ email }))).status).toBe(429);

      vi.setSystemTime(new Date("2026-10-20T12:01:01Z"));
      expect((await POST(request({ email }))).status).toBe(200);
    });
  });

  describe("failures", () => {
    it("should return a JSON error and report to Sentry when the database fails (CR-011)", async () => {
      const failure = new Error("table does not exist");
      db.otpCode.create.mockRejectedValue(failure);

      const res = await POST(request({ email: freshEmail() }));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toMatch(/Klarte ikke å sende engangskode/);
      expect(captureExceptionMock).toHaveBeenCalledWith(failure);
      expect(sendOtpEmailMock).not.toHaveBeenCalled();
    });

    it("should return a JSON error and report to Sentry when sending the e-mail fails", async () => {
      const failure = new Error("SMTP timeout");
      sendOtpEmailMock.mockRejectedValue(failure);

      const res = await POST(request({ email: freshEmail() }));

      expect(res.status).toBe(500);
      expect(captureExceptionMock).toHaveBeenCalledWith(failure);
    });
  });
});
