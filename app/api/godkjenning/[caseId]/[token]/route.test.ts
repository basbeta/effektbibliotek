import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  case: { findUnique: vi.fn(), update: vi.fn() },
  usageApproval: { create: vi.fn() },
  $transaction: vi.fn(),
}));
const emailMocks = vi.hoisted(() => ({
  sendUsageApprovalConfirmation: vi.fn(),
  sendUsageApprovalCopyToBas: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => emailMocks);

import { POST } from "@/app/api/godkjenning/[caseId]/[token]/route";
import { choiceLabels } from "@/lib/usage-approval";

const ctx = (token = "gyldig-token") => ({
  params: Promise.resolve({ caseId: "case1", token }),
});

function request(body: unknown) {
  return new NextRequest("http://localhost/api/godkjenning/case1/gyldig-token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const openCase = {
  id: "case1",
  customerName: "Testkunde AS",
  title: "Testcase",
  usageApprovalToken: "gyldig-token",
  usageApprovalStatus: "open",
  owner: { name: "Test Eier", email: "test.eier@example.com" },
};

const validBody = {
  submitterName: "Test Godkjenner",
  submitterEmail: "test.godkjenner@example.com",
  websiteUseAllowed: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  db.case.findUnique.mockResolvedValue(openCase);
  db.usageApproval.create.mockReturnValue("create-promise");
  db.case.update.mockReturnValue("update-promise");
  db.$transaction.mockResolvedValue([]);
  emailMocks.sendUsageApprovalConfirmation.mockResolvedValue(undefined);
  emailMocks.sendUsageApprovalCopyToBas.mockResolvedValue(undefined);
});

describe("POST /api/godkjenning/[caseId]/[token]", () => {
  describe("link validation", () => {
    it("should return 404 when the case does not exist", async () => {
      db.case.findUnique.mockResolvedValue(null);
      const res = await POST(request(validBody), ctx());
      expect(res.status).toBe(404);
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("should return 404 when the token does not match", async () => {
      const res = await POST(request(validBody), ctx("feil-token"));
      expect(res.status).toBe(404);
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it.each(["not_requested", "submitted_locked"])(
      "should return 409 when the approval status is %s",
      async (status) => {
        db.case.findUnique.mockResolvedValue({ ...openCase, usageApprovalStatus: status });
        const res = await POST(request(validBody), ctx());
        expect(res.status).toBe(409);
        expect(db.$transaction).not.toHaveBeenCalled();
      }
    );
  });

  describe("input validation", () => {
    it.each([
      ["missing name", { ...validBody, submitterName: undefined }],
      ["blank name", { ...validBody, submitterName: "   " }],
      ["missing e-mail", { ...validBody, submitterEmail: undefined }],
      ["blank e-mail", { ...validBody, submitterEmail: "  " }],
    ])("should return 400 for %s", async (_label, body) => {
      const res = await POST(request(body), ctx());
      expect(res.status).toBe(400);
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("should return 400 when no choice is made", async () => {
      const res = await POST(
        request({ submitterName: "Test Godkjenner", submitterEmail: "test@example.com" }),
        ctx()
      );
      expect(res.status).toBe(400);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("saving the approval", () => {
    it("should lock the case and save the choices in both the approval and the case", async () => {
      const res = await POST(
        request({ ...validBody, presentationUseAllowed: true }),
        ctx()
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      const approval = db.usageApproval.create.mock.calls[0][0].data;
      expect(approval).toMatchObject({
        caseId: "case1",
        submittedByName: "Test Godkjenner",
        submittedByEmail: "test.godkjenner@example.com",
        websiteUseAllowed: true,
        presentationUseAllowed: true,
        tenderUseAllowed: false,
        competitionUseAllowed: false,
      });
      expect(approval.lockedAt).toBeInstanceOf(Date);

      expect(db.case.update).toHaveBeenCalledWith({
        where: { id: "case1" },
        data: expect.objectContaining({
          usageApprovalStatus: "submitted_locked",
          websiteUseAllowed: true,
          presentationUseAllowed: true,
        }),
      });
      // Both writes go through one transaction so they succeed or fail together.
      expect(db.$transaction).toHaveBeenCalledWith(["create-promise", "update-promise"]);
    });

    it("should store only NDA when NDA is combined with other choices (server-side enforcement)", async () => {
      await POST(
        request({ ...validBody, ndaRestricted: true, tenderUseAllowed: true, competitionUseAllowed: true }),
        ctx()
      );
      const expected = {
        ndaRestricted: true,
        anonymizedUseOnly: false,
        websiteUseAllowed: false,
        presentationUseAllowed: false,
        tenderUseAllowed: false,
        competitionUseAllowed: false,
      };
      expect(db.usageApproval.create.mock.calls[0][0].data).toMatchObject(expected);
      expect(db.case.update.mock.calls[0][0].data).toMatchObject(expected);
    });

    it("should trim text fields and store empty role and note as null", async () => {
      await POST(
        request({
          ...validBody,
          submitterName: "  Test Godkjenner  ",
          submitterEmail: "  test.godkjenner@example.com ",
          submitterRole: "   ",
          note: "",
        }),
        ctx()
      );
      expect(db.usageApproval.create.mock.calls[0][0].data).toMatchObject({
        submittedByName: "Test Godkjenner",
        submittedByEmail: "test.godkjenner@example.com",
        submittedByRole: null,
        note: null,
      });
    });

    it("should not let the caller choose protected case fields via the request body", async () => {
      await POST(
        request({ ...validBody, usageApprovalStatus: "open", usageApprovalToken: "ny", ownerEmail: "x@example.com" }),
        ctx()
      );
      const update = db.case.update.mock.calls[0][0].data;
      expect(update.usageApprovalStatus).toBe("submitted_locked");
      expect(update).not.toHaveProperty("usageApprovalToken");
      expect(update).not.toHaveProperty("ownerEmail");
    });
  });

  describe("e-mails", () => {
    it("should send a confirmation to the approver and a copy to Bas with readable choice labels", async () => {
      await POST(request({ ...validBody, tenderUseAllowed: true }), ctx());

      expect(emailMocks.sendUsageApprovalConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test.godkjenner@example.com",
          ownerEmail: "test.eier@example.com",
          choices: [choiceLabels.websiteUseAllowed, choiceLabels.tenderUseAllowed],
        })
      );
      expect(emailMocks.sendUsageApprovalCopyToBas).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: "case1", caseTitle: "Testcase" })
      );
    });

    it("should still return 200 when the e-mails fail to send", async () => {
      emailMocks.sendUsageApprovalConfirmation.mockRejectedValue(new Error("SMTP nede"));
      emailMocks.sendUsageApprovalCopyToBas.mockRejectedValue(new Error("SMTP nede"));
      const res = await POST(request(validBody), ctx());
      expect(res.status).toBe(200);
      expect(db.$transaction).toHaveBeenCalled();
    });
  });
});
