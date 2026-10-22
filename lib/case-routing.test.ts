import { describe, it, expect } from "vitest";
import { shouldOpenInEditMode, viewHref } from "@/lib/case-routing";

describe("shouldOpenInEditMode", () => {
  const owner = "eier@example.com";

  it("should send the owner straight to edit", () => {
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: owner, viewParam: undefined })).toBe(true);
  });

  it("should not redirect a user who is not the owner (including an admin on someone else's case)", () => {
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: "annen@example.com", viewParam: undefined })).toBe(false);
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: "admin@example.com", viewParam: undefined })).toBe(false);
  });

  it("should not redirect when nobody is logged in", () => {
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: undefined, viewParam: undefined })).toBe(false);
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: "", viewParam: undefined })).toBe(false);
  });

  it("should never treat a missing user as the owner, even if the owner e-mail is also empty", () => {
    expect(shouldOpenInEditMode({ ownerEmail: "", userEmail: "", viewParam: undefined })).toBe(false);
    expect(shouldOpenInEditMode({ ownerEmail: "", userEmail: undefined, viewParam: undefined })).toBe(false);
  });

  it("should keep the read-only page when the owner asks for it with ?visning", () => {
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: owner, viewParam: "1" })).toBe(false);
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: owner, viewParam: "ja" })).toBe(false);
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: owner, viewParam: ["1"] })).toBe(false);
  });

  it("should treat an empty visning parameter as not asking for the read-only page", () => {
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: owner, viewParam: "" })).toBe(true);
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: owner, viewParam: [] })).toBe(true);
  });

  it("should compare e-mail addresses exactly, like the rest of the app", () => {
    expect(shouldOpenInEditMode({ ownerEmail: owner, userEmail: "EIER@example.com", viewParam: undefined })).toBe(false);
  });
});

describe("viewHref", () => {
  it("should point at the read-only page with the visning flag", () => {
    expect(viewHref("abc123")).toBe("/case/abc123?visning=1");
  });
});
