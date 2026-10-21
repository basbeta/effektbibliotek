import { describe, it, expect, afterEach, vi } from "vitest";
import { formatDate, formatBytes, formatRelativeDate } from "@/lib/format";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatDate", () => {
  // Regression for CR-029: the container runs in UTC, so formatting must use
  // Europe/Oslo explicitly. These instants fall on different calendar days in
  // UTC and in Oslo, so a missing timeZone option changes the output.
  it("should use Oslo summer time (UTC+2) when crossing midnight", () => {
    expect(formatDate(new Date("2026-07-01T22:30:00Z"))).toBe("2. juli 2026");
  });

  it("should use Oslo winter time (UTC+1) when crossing midnight", () => {
    expect(formatDate(new Date("2026-01-31T23:30:00Z"))).toBe("1. feb. 2026");
  });

  it("should not shift a mid-day instant", () => {
    expect(formatDate(new Date("2026-07-01T12:00:00Z"))).toBe("1. juli 2026");
  });

  it("should accept an ISO string as well as a Date", () => {
    expect(formatDate("2026-07-01T22:30:00Z")).toBe(formatDate(new Date("2026-07-01T22:30:00Z")));
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [70, "70 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1536, "2 KB"],
    [1024 * 1024, "1.0 MB"],
    [5.5 * 1024 * 1024, "5.5 MB"],
    [100 * 1024 * 1024, "100.0 MB"],
  ])("should format %d bytes as %j", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-10-20T12:00:00Z");

  function at(msAgo: number) {
    return new Date(now.getTime() - msAgo);
  }
  const DAY = 24 * 60 * 60 * 1000;

  it("should say 'I dag' within the last 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeDate(at(60 * 60 * 1000))).toBe("I dag");
    expect(formatRelativeDate(at(DAY - 1))).toBe("I dag");
  });

  it("should say 'I går' between 24 and 48 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeDate(at(DAY))).toBe("I går");
    expect(formatRelativeDate(at(2 * DAY - 1))).toBe("I går");
  });

  it("should count days for 2 to 6 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeDate(at(2 * DAY))).toBe("2 dager siden");
    expect(formatRelativeDate(at(6 * DAY))).toBe("6 dager siden");
  });

  it("should fall back to a formatted date from 7 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const old = at(7 * DAY);
    expect(formatRelativeDate(old)).toBe(formatDate(old));
  });
});
