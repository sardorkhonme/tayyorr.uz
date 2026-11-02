import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SMM_URL = (process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma sxemasi repo ildizida (../prisma) — umumiy baza
  outputFileTracingRoot: join(__dirname, ".."),
  // ro'yxatdan o'tishda kichraytirilgan profil rasmi (base64) server action orqali keladi
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Tayyorr SMM alohida saytga (smm.tayyorr.uz) ko'chdi — eski havolalar o'sha yerga
  async redirects() {
    return [
      { source: "/smm", destination: `${SMM_URL}/`, permanent: false },
      { source: "/orders", destination: `${SMM_URL}/orders`, permanent: false },
    ];
  },
  // tashqi cron (cron-job.org) eski manzilga urilsa ham ishlayversin
  async rewrites() {
    return [{ source: "/api/cron/sync", destination: `${SMM_URL}/api/cron/sync` }];
  },
};

export default nextConfig;
