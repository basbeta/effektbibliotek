import { describe, it, expect, beforeEach, vi } from "vitest";
import JSZip from "jszip";

// The S3 client is created at module load, so the SDK must be mocked before
// "@/lib/storage" is imported. No network or credentials are involved.
const sendMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => {
  class Command {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    S3Client: class {
      send = sendMock;
    },
    PutObjectCommand: class extends Command {},
    DeleteObjectCommand: class extends Command {},
    GetObjectCommand: class extends Command {},
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn() }));

import {
  ALLOWED_CASE_FILE_TYPES,
  MAX_CASE_FILES_TOTAL_BYTES,
  isAllowedCaseFileType,
  slugifyForFilename,
  uploadCaseFile,
  buildCaseZip,
} from "@/lib/storage";

beforeEach(() => {
  sendMock.mockReset();
});

describe("MAX_CASE_FILES_TOTAL_BYTES", () => {
  it("should be 100 MB", () => {
    expect(MAX_CASE_FILES_TOTAL_BYTES).toBe(100 * 1024 * 1024);
  });
});

describe("isAllowedCaseFileType", () => {
  const valid: [string, string][] = [
    ["photo.jpg", "image/jpeg"],
    ["photo.jpeg", "image/jpeg"],
    ["image.png", "image/png"],
    ["image.webp", "image/webp"],
    ["anim.gif", "image/gif"],
    ["report.pdf", "application/pdf"],
    ["old.doc", "application/msword"],
    ["new.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ];

  it.each(valid)("should accept %s as %s", (filename, mime) => {
    expect(isAllowedCaseFileType(filename, mime)).toBe(true);
  });

  it("should cover every allowed type/extension combination listed in the config", () => {
    for (const { mimeType, extensions } of ALLOWED_CASE_FILE_TYPES) {
      for (const ext of extensions) {
        expect(isAllowedCaseFileType(`file.${ext}`, mimeType)).toBe(true);
      }
    }
  });

  it("should ignore filename case", () => {
    expect(isAllowedCaseFileType("PHOTO.JPG", "image/jpeg")).toBe(true);
  });

  it("should reject a mismatch between extension and MIME type", () => {
    expect(isAllowedCaseFileType("image.png", "application/pdf")).toBe(false);
    expect(
      isAllowedCaseFileType(
        "old.doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(false);
  });

  it("should judge by the last extension only", () => {
    expect(isAllowedCaseFileType("photo.png.exe", "image/png")).toBe(false);
  });

  it("should reject files without a recognised extension", () => {
    expect(isAllowedCaseFileType("README", "image/png")).toBe(false);
    expect(isAllowedCaseFileType("archive.zip", "application/zip")).toBe(false);
    expect(isAllowedCaseFileType("script.js", "text/javascript")).toBe(false);
  });
});

describe("slugifyForFilename", () => {
  it("should lowercase, replace separators and keep æøå", () => {
    expect(slugifyForFilename("Åpent Kundemøte – Høst 2026!")).toBe("åpent-kundemøte-høst-2026");
  });

  it("should trim leading and trailing separators", () => {
    expect(slugifyForFilename("  --Hei--  ")).toBe("hei");
  });

  it("should cap the length at 80 characters", () => {
    expect(slugifyForFilename("a".repeat(200))).toHaveLength(80);
  });

  it("should return an empty string when nothing usable remains", () => {
    expect(slugifyForFilename("!!!")).toBe("");
    expect(slugifyForFilename("")).toBe("");
  });
});

describe("uploadCaseFile", () => {
  it("should store the file under the case prefix with a sanitized name", async () => {
    sendMock.mockResolvedValue({});
    const { storageKey } = await uploadCaseFile(
      "case123",
      "../evil file (1).png",
      Buffer.from("x"),
      "image/png"
    );

    expect(storageKey.startsWith("effektbibliotek/case-materiale/case123/")).toBe(true);
    // No path traversal: the file name must not add any path segments.
    expect(storageKey.split("/")).toHaveLength(4);
    expect(storageKey).toMatch(/-\.\.-evil-file--1-\.png$/);

    const command = sendMock.mock.calls[0][0];
    expect(command.input.Key).toBe(storageKey);
    expect(command.input.ContentType).toBe("image/png");
  });

  it("should give two uploads of the same file name different keys", async () => {
    sendMock.mockResolvedValue({});
    const a = await uploadCaseFile("c", "same.png", Buffer.from("a"), "image/png");
    const b = await uploadCaseFile("c", "same.png", Buffer.from("b"), "image/png");
    expect(a.storageKey).not.toBe(b.storageKey);
  });
});

describe("buildCaseZip", () => {
  function mockS3Contents(contents: Record<string, string>) {
    sendMock.mockImplementation(async (command: { input: { Key: string } }) => ({
      Body: {
        transformToByteArray: async () => new TextEncoder().encode(contents[command.input.Key]),
      },
    }));
  }

  async function entries(buffer: Buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const result: Record<string, string> = {};
    for (const name of Object.keys(zip.files)) result[name] = await zip.files[name].async("string");
    return result;
  }

  it("should put extra entries and uploaded files in the same archive", async () => {
    mockS3Contents({ "key-1": "image-bytes" });
    const zip = await buildCaseZip(
      [{ filename: "case.txt", content: "summary" }],
      [{ filename: "photo.png", storageKey: "key-1" }]
    );
    expect(await entries(zip)).toEqual({ "case.txt": "summary", "photo.png": "image-bytes" });
  });

  it("should number files that share a name instead of overwriting them", async () => {
    mockS3Contents({ k1: "one", k2: "two", k3: "three" });
    const zip = await buildCaseZip(
      [],
      [
        { filename: "a.png", storageKey: "k1" },
        { filename: "a.png", storageKey: "k2" },
        { filename: "a.png", storageKey: "k3" },
      ]
    );
    expect(await entries(zip)).toEqual({ "a.png": "one", "a-2.png": "two", "a-3.png": "three" });
  });

  it("should keep an extra entry's name and rename a colliding file", async () => {
    mockS3Contents({ k1: "file-content" });
    const zip = await buildCaseZip(
      [{ filename: "notes.txt", content: "extra" }],
      [{ filename: "notes.txt", storageKey: "k1" }]
    );
    expect(await entries(zip)).toEqual({ "notes.txt": "extra", "notes-2.txt": "file-content" });
  });

  it("should number colliding names that have no extension", async () => {
    mockS3Contents({ k1: "one", k2: "two" });
    const zip = await buildCaseZip(
      [],
      [
        { filename: "README", storageKey: "k1" },
        { filename: "README", storageKey: "k2" },
      ]
    );
    expect(Object.keys(await entries(zip)).sort()).toEqual(["README", "README-2"]);
  });

  it("should produce a valid empty archive when there is nothing to add", async () => {
    const zip = await buildCaseZip([], []);
    expect(await entries(zip)).toEqual({});
    expect(sendMock).not.toHaveBeenCalled();
  });
});
