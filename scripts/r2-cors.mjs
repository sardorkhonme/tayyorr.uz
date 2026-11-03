#!/usr/bin/env node
/**
 * R2 bucket'lariga barcha *.tayyorr.uz saytlaridan yuklashga ruxsat (CORS) qo'shadi.
 * Brauzer faylni to'g'ridan-to'g'ri R2 ga yuklaydi (presigned PUT), shuning uchun har bir
 * sayt manzili bucket'ning AllowedOrigins ro'yxatida bo'lishi shart. Mavjud qoidalar saqlanadi.
 *
 *   node --env-file=.env scripts/r2-cors.mjs           — faqat ko'rsatadi
 *   node --env-file=.env scripts/r2-cors.mjs --apply   — yozadi
 */
import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const ORIGINS = [
  "https://tayyorr.uz",
  "https://www.tayyorr.uz",
  "https://app.tayyorr.uz",
  "https://admin.tayyorr.uz",
  "https://plus.tayyorr.uz",
  "https://smm.tayyorr.uz",
];

const apply = process.argv.includes("--apply");
const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

for (const bucket of [process.env.R2_BUCKET_PUBLIC || "tayyorr-public", process.env.R2_BUCKET_PRIVATE || "tayyorr-private"]) {
  const current = (await s3.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules ?? [];
  const rules = current.length
    ? current.map((r) => ({ ...r, AllowedOrigins: [...new Set([...(r.AllowedOrigins ?? []), ...ORIGINS])] }))
    : [{ AllowedMethods: ["GET", "PUT", "HEAD"], AllowedOrigins: ORIGINS, AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }];
  console.log(`${bucket}:\n  hozir:  ${current.flatMap((r) => r.AllowedOrigins).join(" ")}\n  yangi:  ${rules.flatMap((r) => r.AllowedOrigins).join(" ")}`);
  if (apply) {
    await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }));
    console.log("  ✓ yozildi");
  }
}
if (!apply) console.log("\nYozish uchun: node --env-file=.env scripts/r2-cors.mjs --apply");
