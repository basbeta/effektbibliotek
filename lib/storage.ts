import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import JSZip from "jszip";

const BUCKET = process.env.S3_BUCKET ?? "";
const KEY_PREFIX = "effektbibliotek/case-materiale/";

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

export const MAX_CASE_FILES_TOTAL_BYTES = 100 * 1024 * 1024;

export const ALLOWED_CASE_FILE_TYPES: { mimeType: string; extensions: string[] }[] = [
  { mimeType: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { mimeType: "image/png", extensions: ["png"] },
  { mimeType: "image/webp", extensions: ["webp"] },
  { mimeType: "image/gif", extensions: ["gif"] },
  { mimeType: "application/pdf", extensions: ["pdf"] },
  { mimeType: "application/msword", extensions: ["doc"] },
  {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["docx"],
  },
];

export function isAllowedCaseFileType(filename: string, mimeType: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_CASE_FILE_TYPES.some(
    (t) => t.mimeType === mimeType && t.extensions.includes(ext)
  );
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadCaseFile(
  caseId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ storageKey: string }> {
  const storageKey = `${KEY_PREFIX}${caseId}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return { storageKey };
}

export async function deleteCaseFile(storageKey: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}

export async function getCaseFileDownloadUrl(
  storageKey: string,
  filename: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ResponseContentDisposition: `attachment; filename="${sanitizeFilename(filename)}"`,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function getCaseFileBuffer(storageKey: string): Promise<Buffer> {
  const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
  const bytes = await result.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export function slugifyForFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Zips extra in-memory entries (e.g. a generated text summary) together with
 * a case's uploaded files, fetched from S3. Duplicate filenames are
 * disambiguated with a numeric suffix so nothing silently overwrites another
 * entry inside the archive.
 */
export async function buildCaseZip(
  extraEntries: { filename: string; content: string | Buffer }[],
  files: { filename: string; storageKey: string }[]
): Promise<Buffer> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  function uniqueName(name: string): string {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let i = 2;
    let candidate = `${base}-${i}${ext}`;
    while (usedNames.has(candidate)) {
      i += 1;
      candidate = `${base}-${i}${ext}`;
    }
    usedNames.add(candidate);
    return candidate;
  }

  for (const entry of extraEntries) {
    zip.file(uniqueName(entry.filename), entry.content);
  }
  for (const file of files) {
    const buffer = await getCaseFileBuffer(file.storageKey);
    zip.file(uniqueName(file.filename), buffer);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
