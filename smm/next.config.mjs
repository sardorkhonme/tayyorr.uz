import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma sxemasi repo ildizida (../prisma) — umumiy baza
  outputFileTracingRoot: join(__dirname, ".."),
  // ro'yxatdan o'tishda kichraytirilgan profil rasmi (base64) server action orqali keladi
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
