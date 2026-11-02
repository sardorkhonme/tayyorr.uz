import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma sxemasi repo ildizida (../prisma) — umumiy baza
  outputFileTracingRoot: join(__dirname, ".."),
};

export default nextConfig;
