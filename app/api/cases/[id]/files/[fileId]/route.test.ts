import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const getSessionMock = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  case: { findUnique: vi.fn() },
  caseFile: { findUnique: vi.fn(), delete: vi.fn() },
}));
const storage = vi.hoisted(() => ({
  deleteCaseFile: vi.fn(),
  getCaseFileDownloadUrl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSession: getSessionMock }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/storage", () => storage);

import { GET, DELETE } from "@/app/api/cases/[id]/files/[fileId]/route";

const ctx = { params: Promise.resolve({ id: "case1", fileId: "file1" }) };

const get = () => new NextRequest("http://localhost/api/cases/case1/files/file1");
const del = () => new NextRequest("http://localhost/api/cases/case1/files/file1", { method: "DELETE" });

const file = { id: "file1", caseId: "case1", storageKey: "prefix/case1/uuid-bilde.png", filename: "bilde.png" };
const ownedCase = { id: "case1", ownerEmail: "eier@example.com" };

function loggedInAs(userEmail: string, isAdmin = false) {
  getSessionMock.mockResolvedValue({ userEmail, isAdmin });
}

beforeEach(() => {
  vi.resetAllMocks();
  db.case.findUnique.mockResolvedValue(ownedCase);
  db.caseFile.findUnique.mockResolvedValue(file);
  db.caseFile.delete.mockResolvedValue({});
  storage.deleteCaseFile.mockResolvedValue(undefined);
  storage.getCaseFileDownloadUrl.mockResolvedValue("https://s3.example.com/signed?sig=abc");
});

describe("GET /api/cases/[id]/files/[fileId]", () => {
  it("should return 401 when not logged in", async () => {
    getSessionMock.mockResolvedValue({});
    const res = await GET(get(), ctx);
    expect(res.status).toBe(401);
    expect(storage.getCaseFileDownloadUrl).not.toHaveBeenCalled();
  });

  it("should return 404 when the file does not exist", async () => {
    loggedInAs("annen@example.com");
    db.caseFile.findUnique.mockResolvedValue(null);
    const res = await GET(get(), ctx);
    expect(res.status).toBe(404);
  });

  it("should return 404 when the file belongs to a different case", async () => {
    loggedInAs("annen@example.com");
    db.caseFile.findUnique.mockResolvedValue({ ...file, caseId: "annen-case" });
    const res = await GET(get(), ctx);
    expect(res.status).toBe(404);
    expect(storage.getCaseFileDownloadUrl).not.toHaveBeenCalled();
  });

  it("should redirect any logged-in user to a presigned download URL", async () => {
    loggedInAs("annen@example.com");
    const res = await GET(get(), ctx);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe("https://s3.example.com/signed?sig=abc");
    expect(storage.getCaseFileDownloadUrl).toHaveBeenCalledWith(file.storageKey, "bilde.png");
  });
});

describe("DELETE /api/cases/[id]/files/[fileId]", () => {
  it("should return 401 when not logged in", async () => {
    getSessionMock.mockResolvedValue({});
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(401);
    expect(storage.deleteCaseFile).not.toHaveBeenCalled();
  });

  it("should return 404 when the case does not exist", async () => {
    loggedInAs("eier@example.com");
    db.case.findUnique.mockResolvedValue(null);
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(404);
  });

  it("should return 403 for a user who is neither owner nor admin", async () => {
    loggedInAs("annen@example.com");
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(403);
    expect(storage.deleteCaseFile).not.toHaveBeenCalled();
    expect(db.caseFile.delete).not.toHaveBeenCalled();
  });

  it("should return 404 when the file belongs to a different case", async () => {
    loggedInAs("eier@example.com");
    db.caseFile.findUnique.mockResolvedValue({ ...file, caseId: "annen-case" });
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(404);
    expect(storage.deleteCaseFile).not.toHaveBeenCalled();
    expect(db.caseFile.delete).not.toHaveBeenCalled();
  });

  it("should let the owner delete the S3 object and then the database row", async () => {
    loggedInAs("eier@example.com");
    const order: string[] = [];
    storage.deleteCaseFile.mockImplementation(async () => void order.push("s3"));
    db.caseFile.delete.mockImplementation(async () => void order.push("db"));

    const res = await DELETE(del(), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(storage.deleteCaseFile).toHaveBeenCalledWith(file.storageKey);
    expect(db.caseFile.delete).toHaveBeenCalledWith({ where: { id: "file1" } });
    expect(order).toEqual(["s3", "db"]);
  });

  it("should let an admin who is not the owner delete the file", async () => {
    loggedInAs("admin@example.com", true);
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(200);
    expect(db.caseFile.delete).toHaveBeenCalled();
  });

  it("should keep the database row when the S3 delete fails", async () => {
    loggedInAs("eier@example.com");
    storage.deleteCaseFile.mockRejectedValue(new Error("S3 nede"));
    await expect(DELETE(del(), ctx)).rejects.toThrow("S3 nede");
    expect(db.caseFile.delete).not.toHaveBeenCalled();
  });
});
