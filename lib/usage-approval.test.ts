import { describe, it, expect } from "vitest";
import {
  sanitizeChoices,
  buildApprovalText,
  buildPrivacyNotice,
  choiceLabels,
  GDPR_NOTICE,
  type ApprovalChoices,
} from "@/lib/usage-approval";

const none: ApprovalChoices = {
  ndaRestricted: false,
  anonymizedUseOnly: false,
  websiteUseAllowed: false,
  presentationUseAllowed: false,
  tenderUseAllowed: false,
  competitionUseAllowed: false,
};

const allUse = {
  websiteUseAllowed: true,
  presentationUseAllowed: true,
  tenderUseAllowed: true,
  competitionUseAllowed: true,
};

describe("sanitizeChoices", () => {
  it("should keep only NDA when NDA is combined with every other choice", () => {
    const result = sanitizeChoices({ ...none, ndaRestricted: true, anonymizedUseOnly: true, ...allUse });
    expect(result).toEqual({ ...none, ndaRestricted: true });
  });

  it("should keep only anonymizedUseOnly when it is combined with the usage choices", () => {
    const result = sanitizeChoices({ ...none, anonymizedUseOnly: true, ...allUse });
    expect(result).toEqual({ ...none, anonymizedUseOnly: true });
  });

  it("should let NDA win over anonymizedUseOnly", () => {
    const result = sanitizeChoices({ ...none, ndaRestricted: true, anonymizedUseOnly: true });
    expect(result).toEqual({ ...none, ndaRestricted: true });
  });

  it("should pass independent usage choices through unchanged", () => {
    const input = { ...none, websiteUseAllowed: true, tenderUseAllowed: true };
    expect(sanitizeChoices(input)).toEqual(input);
  });

  it("should return all false when nothing is chosen", () => {
    expect(sanitizeChoices(none)).toEqual(none);
  });

  it("should coerce truthy or missing values to real booleans", () => {
    const sloppy = {
      ndaRestricted: false,
      anonymizedUseOnly: false,
      websiteUseAllowed: "yes",
      presentationUseAllowed: undefined,
      tenderUseAllowed: 1,
      competitionUseAllowed: null,
    } as unknown as ApprovalChoices;
    expect(sanitizeChoices(sloppy)).toEqual({
      ...none,
      websiteUseAllowed: true,
      tenderUseAllowed: true,
    });
  });
});

describe("buildPrivacyNotice", () => {
  it("should name the case owner and their e-mail address", () => {
    const text = buildPrivacyNotice("Test Eier", "test.eier@example.com");
    expect(text).toContain("Test Eier");
    expect(text).toContain("test.eier@example.com");
    expect(text.startsWith("Personvern:")).toBe(true);
  });
});

describe("buildApprovalText", () => {
  const params = {
    ownerName: "Test Eier",
    ownerEmail: "test.eier@example.com",
    caseTitle: "Testcase",
    caseId: "case123",
    token: "tok456",
    appUrl: "https://app.example.com",
  };

  it("should build the approval link from appUrl, caseId and token", () => {
    const text = buildApprovalText(params);
    expect(text).toContain("https://app.example.com/godkjenning/case123/tok456");
  });

  it("should greet the approver by name when a name is given", () => {
    expect(buildApprovalText({ ...params, approverName: "Test Godkjenner" })).toMatch(
      /^Hei Test Godkjenner,/
    );
  });

  it("should use a generic greeting when no approver name is given", () => {
    expect(buildApprovalText(params)).toMatch(/^Hei,\n/);
  });

  it("should quote the case title and name the owner as contact", () => {
    const text = buildApprovalText(params);
    expect(text).toContain("«Testcase»");
    expect(text).toContain("Ta gjerne kontakt med Test Eier på test.eier@example.com");
  });

  it("should include the privacy notice and the GDPR notice", () => {
    const text = buildApprovalText(params);
    expect(text).toContain(buildPrivacyNotice(params.ownerName, params.ownerEmail));
    expect(text).toContain(GDPR_NOTICE);
  });
});

describe("choiceLabels", () => {
  it("should have a non-empty label for every approval choice", () => {
    const keys = Object.keys(none) as (keyof ApprovalChoices)[];
    expect(Object.keys(choiceLabels).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(choiceLabels[key].length).toBeGreaterThan(0);
  });
});
