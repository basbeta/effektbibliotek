import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const getSessionMock = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  case: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  caseFile: { findMany: vi.fn() },
}));
const deleteCaseFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getSession: getSessionMock }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/storage", () => ({ deleteCaseFile: deleteCaseFileMock }));

import { PATCH, DELETE } from "@/app/api/cases/[id]/route";

const ctx = { params: Promise.resolve({ id: "case1" }) };

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/cases/case1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
function deleteRequest() {
  return new NextRequest("http://localhost/api/cases/case1", { method: "DELETE" });
}

function loggedInAs(userEmail: string, isAdmin = false) {
  getSessionMock.mockResolvedValue({ userEmail, isAdmin });
}

const existingCase = {
  id: "case1",
  ownerEmail: "eier@example.com",
  usageApprovalStatus: "open",
};

beforeEach(() => {
  vi.resetAllMocks();
  db.case.update.mockImplementation(async ({ data }: { data: unknown }) => ({ id: "case1", ...(data as object) }));
  db.case.delete.mockResolvedValue({});
  db.caseFile.findMany.mockResolvedValue([]);
  deleteCaseFileMock.mockResolvedValue(undefined);
});

describe("PATCH /api/cases/[id]", () => {
  it("should return 401 when not logged in", async () => {
    getSessionMock.mockResolvedValue({});
    const res = await PATCH(patchRequest({ title: "x" }), ctx);
    expect(res.status).toBe(401);
    expect(db.case.update).not.toHaveBeenCalled();
  });

  it("should return 404 when the case does not exist", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(null);
    const res = await PATCH(patchRequest({ title: "x" }), ctx);
    expect(res.status).toBe(404);
  });

  it("should return 403 for a user who is neither owner nor admin", async () => {
    loggedInAs("annen@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    const res = await PATCH(patchRequest({ title: "x" }), ctx);
    expect(res.status).toBe(403);
    expect(db.case.update).not.toHaveBeenCalled();
  });

  it("should let the owner update allowed fields and record who updated", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    const res = await PATCH(patchRequest({ title: "Ny tittel", problem: "P" }), ctx);
    expect(res.status).toBe(200);
    expect(db.case.update).toHaveBeenCalledWith({
      where: { id: "case1" },
      data: { updatedByEmail: "eier@example.com", title: "Ny tittel", problem: "P" },
    });
  });

  it("should let an admin who is not the owner update the case", async () => {
    loggedInAs("admin@example.com", true);
    db.case.findUnique.mockResolvedValue(existingCase);
    const res = await PATCH(patchRequest({ title: "Admin-endring" }), ctx);
    expect(res.status).toBe(200);
    expect(db.case.update.mock.calls[0][0].data.updatedByEmail).toBe("admin@example.com");
  });

  it("should let the owner transfer ownership", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    await PATCH(patchRequest({ ownerEmail: "ny.eier@example.com" }), ctx);
    expect(db.case.update.mock.calls[0][0].data.ownerEmail).toBe("ny.eier@example.com");
  });

  it("should ignore fields that are not on the allow-list", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    await PATCH(
      patchRequest({
        title: "Ok",
        id: "annen-id",
        usageApprovalStatus: "not_requested",
        usageApprovalToken: "stjålet",
        createdByEmail: "falsk@example.com",
        pitchText: "feltet er fjernet (CR-033) og skal ignoreres",
      }),
      ctx
    );
    expect(db.case.update.mock.calls[0][0].data).toEqual({
      updatedByEmail: "eier@example.com",
      title: "Ok",
    });
  });

  describe("usage rights", () => {
    const usageBody = {
      ndaRestricted: true,
      anonymizedUseOnly: true,
      websiteUseAllowed: true,
      presentationUseAllowed: true,
      tenderUseAllowed: true,
      competitionUseAllowed: true,
    };

    it("should drop every usage-rights field once the approval is locked (CR-021)", async () => {
      loggedInAs("eier@example.com");
      db.case.findUnique.mockResolvedValue({ ...existingCase, usageApprovalStatus: "submitted_locked" });
      await PATCH(patchRequest({ ...usageBody, title: "Annet felt går gjennom" }), ctx);
      expect(db.case.update.mock.calls[0][0].data).toEqual({
        updatedByEmail: "eier@example.com",
        title: "Annet felt går gjennom",
      });
    });

    it("should also block usage-rights changes by an admin while locked", async () => {
      loggedInAs("admin@example.com", true);
      db.case.findUnique.mockResolvedValue({ ...existingCase, usageApprovalStatus: "submitted_locked" });
      await PATCH(patchRequest({ websiteUseAllowed: true }), ctx);
      expect(db.case.update.mock.calls[0][0].data).not.toHaveProperty("websiteUseAllowed");
    });

    it("should allow usage-rights fields while the approval is not locked", async () => {
      for (const status of ["not_requested", "open"]) {
        db.case.update.mockClear();
        loggedInAs("eier@example.com");
        db.case.findUnique.mockResolvedValue({ ...existingCase, usageApprovalStatus: status });
        await PATCH(patchRequest(usageBody), ctx);
        expect(db.case.update.mock.calls[0][0].data).toMatchObject(usageBody);
      }
    });
  });
});

describe("DELETE /api/cases/[id]", () => {
  it("should return 401 when not logged in", async () => {
    getSessionMock.mockResolvedValue({});
    const res = await DELETE(deleteRequest(), ctx);
    expect(res.status).toBe(401);
    expect(db.case.delete).not.toHaveBeenCalled();
  });

  it("should return 404 when the case does not exist", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(null);
    const res = await DELETE(deleteRequest(), ctx);
    expect(res.status).toBe(404);
    expect(db.case.delete).not.toHaveBeenCalled();
  });

  it("should return 403 for a user who is neither owner nor admin", async () => {
    loggedInAs("annen@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    const res = await DELETE(deleteRequest(), ctx);
    expect(res.status).toBe(403);
    expect(db.case.delete).not.toHaveBeenCalled();
    expect(deleteCaseFileMock).not.toHaveBeenCalled();
  });

  it("should let the owner delete the case and remove its S3 objects first", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    db.caseFile.findMany.mockResolvedValue([{ storageKey: "k1" }, { storageKey: "k2" }]);

    const res = await DELETE(deleteRequest(), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.caseFile.findMany).toHaveBeenCalledWith({ where: { caseId: "case1" } });
    expect(deleteCaseFileMock.mock.calls.map((c) => c[0]).sort()).toEqual(["k1", "k2"]);
    expect(db.case.delete).toHaveBeenCalledWith({ where: { id: "case1" } });
  });

  it("should let an admin who is not the owner delete the case", async () => {
    loggedInAs("admin@example.com", true);
    db.case.findUnique.mockResolvedValue(existingCase);
    const res = await DELETE(deleteRequest(), ctx);
    expect(res.status).toBe(200);
    expect(db.case.delete).toHaveBeenCalled();
  });

  // Documents current behaviour (Promise.allSettled): a failing S3 delete does
  // not stop the case from being deleted, so the object can be left orphaned
  // in the bucket without any error reaching the user.
  it("should still delete the case when an S3 delete fails", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(existingCase);
    db.caseFile.findMany.mockResolvedValue([{ storageKey: "k1" }, { storageKey: "k2" }]);
    deleteCaseFileMock.mockRejectedValueOnce(new Error("S3 nede")).mockResolvedValueOnce(undefined);

    const res = await DELETE(deleteRequest(), ctx);

    expect(res.status).toBe(200);
    expect(deleteCaseFileMock).toHaveBeenCalledTimes(2);
    expect(db.case.delete).toHaveBeenCalledWith({ where: { id: "case1" } });
  });
});
