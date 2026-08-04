import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
