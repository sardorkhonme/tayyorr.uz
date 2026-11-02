import { randomUUID } from "crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID!;
const endpoint =
  process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

export const PUBLIC_BUCKET = process.env.R2_BUCKET_PUBLIC || "tayyorr-public";
export const PRIVATE_BUCKET = process.env.R2_BUCKET_PRIVATE || "tayyorr-private";
export const PUBLIC_BASE_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/** Xavfsiz, tartiblangan obyekt kaliti hosil qiladi. */
export function buildKey(prefix: string, filename: string) {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const safePrefix = prefix.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "");
  return `${safePrefix}/${Date.now()}-${randomUUID()}.${ext}`;
}

/** Brauzer to'g'ridan-to'g'ri yuklashi uchun PUT presigned URL. */
export function presignPut(opts: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: opts.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
    }),
    { expiresIn: opts.expiresIn ?? 600 },
  );
}

/** Yopiq fayllarni yuklab olish uchun vaqtinchalik GET URL. */
export function presignGet(opts: {
  bucket: string;
  key: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: opts.bucket, Key: opts.key }),
    { expiresIn: opts.expiresIn ?? 600 },
  );
}

export function deleteObject(bucket: string, key: string) {
  return r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** public bucketdagi kalitni to'liq URL ga aylantiradi. */
export function publicUrl(key: string) {
  return `${PUBLIC_BASE_URL}/${key}`;
}
