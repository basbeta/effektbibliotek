import { describe, it, expect, beforeEach, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({ case: { findMany: vi.fn() } }));

vi.mock("@/lib/auth", () => ({ getSession: getSessionMock }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET } from "@/app/api/customers/route";

beforeEach(() => {
  vi.resetAllMocks();
  getSessionMock.mockResolvedValue({ userEmail: "bruker@example.com" });
  db.case.findMany.mockResolvedValue([]);
});

describe("GET /api/customers", () => {
  it("should return 401 when not logged in", async () => {
    getSessionMock.mockResolvedValue({});
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.case.findMany).not.toHaveBeenCalled();
  });

  it("should ask the database for distinct customer names in alphabetical order", async () => {
    await GET();
    expect(db.case.findMany).toHaveBeenCalledWith({
      select: { customerName: true },
      distinct: ["customerName"],
      orderBy: { customerName: "asc" },
    });
  });

  it("should return only the names, as a plain list", async () => {
    db.case.findMany.mockResolvedValue([
      { customerName: "Alfa AS" },
      { customerName: "Beta AS" },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(["Alfa AS", "Beta AS"]);
  });

  it("should trim names, drop empty ones and remove duplicates that differ only by whitespace", async () => {
    db.case.findMany.mockResolvedValue([
      { customerName: "Alfa AS" },
      { customerName: "  Alfa AS " },
      { customerName: "   " },
      { customerName: "Beta AS" },
    ]);
    const res = await GET();
    expect(await res.json()).toEqual(["Alfa AS", "Beta AS"]);
  });

  it("should return an empty list when there are no cases", async () => {
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });
});
