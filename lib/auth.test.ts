import { describe, it, expect } from "vitest";
import { isBasEmail, nameFromEmail, generateOtp, hashOtp, verifyOtp } from "@/lib/auth";

describe("isBasEmail", () => {
  it.each(["test.bruker@bas.no", "TEST.BRUKER@BAS.NO", "  test.bruker@bas.no  "])(
    "should accept %j",
    (email) => {
      expect(isBasEmail(email)).toBe(true);
    }
  );

  it.each([
    "test.bruker@gmail.com",
    "test.bruker@bas.no.example.com",
    "test.bruker@xbas.no",
    "test.bruker@sub.bas.no",
    "bas.no",
    "",
  ])("should reject %j", (email) => {
    expect(isBasEmail(email)).toBe(false);
  });
});

describe("nameFromEmail", () => {
  it("should capitalize each dot-separated part of the local part", () => {
    expect(nameFromEmail("test.bruker@bas.no")).toBe("Test Bruker");
  });

  it("should handle a local part without dots", () => {
    expect(nameFromEmail("testbruker@bas.no")).toBe("Testbruker");
  });

  it("should keep three-part names intact", () => {
    expect(nameFromEmail("test.midt.bruker@bas.no")).toBe("Test Midt Bruker");
  });
});

describe("generateOtp", () => {
  it("should return a six-digit numeric string", () => {
    for (let i = 0; i < 200; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThanOrEqual(999999);
    }
  });
});

describe("hashOtp / verifyOtp", () => {
  it("should verify the original code against its hash", async () => {
    const hash = await hashOtp("123456");
    expect(hash).not.toBe("123456");
    expect(await verifyOtp("123456", hash)).toBe(true);
  });

  it("should reject a different code", async () => {
    const hash = await hashOtp("123456");
    expect(await verifyOtp("654321", hash)).toBe(false);
  });

  it("should produce different hashes for the same code (salted)", async () => {
    const [a, b] = await Promise.all([hashOtp("123456"), hashOtp("123456")]);
    expect(a).not.toBe(b);
  });
});
