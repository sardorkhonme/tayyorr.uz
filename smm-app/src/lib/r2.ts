import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** tayyorr.uz bilan bir xil R2: public bucket — profil rasmlari, private — support chati fayllari. */
const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
const PUBLIC_BUCKET = process.env.R2_BUCKET_PUBLIC || "tayyorr-public";
const PRIVATE_BUCKET = process.env.R2_BUCKET_PRIVATE || "tayyorr-private";
const PUBLIC_BASE_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

let client: S3Client | null = null;
function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return client;
}

export function r2Configured() {
  return !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && PUBLIC_BASE_URL);
}

/** Faylni public bucketga yozadi va ochiq URL qaytaradi. */
export async function putPublic(key: string, body: Uint8Array, contentType: string) {
  await r2().send(new PutObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${PUBLIC_BASE_URL}/${key}`;
}

/** Chat fayli — private bucketga (tayyorr.uz chatidagi kabi "chat/<suhbat>/..." kaliti). */
export async function putPrivate(key: string, body: Uint8Array, contentType: string) {
  await r2().send(new PutObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

/** Private fayl uchun vaqtinchalik havola; `download` — brauzer ochmasdan yuklab oladi. */
export function presignPrivate(key: string, opts: { download?: string; expiresIn?: number } = {}) {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: key,
      ...(opts.download
        ? { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(opts.download)}` }
        : {}),
    }),
    { expiresIn: opts.expiresIn ?? 3600 },
  );
}
