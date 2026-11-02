import { fileURLToPath } from "url";
import { dirname } from "path";

/**
 * tayyorr.uz — faqat landing. Kabinet (app.tayyorr.uz) va admin (admin.tayyorr.uz)
 * alohida loyihalar; eski havolalar o'sha yerga yo'naltiriladi.
 * /api — app.tayyorr.uz ga proksi: mobil ilova, Click va Telegram webhook'lari
 * eski manzilda (tayyorr.uz/api/...) ishlashda davom etadi.
 */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "");
const ADMIN_URL = (process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.tayyorr.uz").replace(/\/+$/, "");

const APP_PATHS = [
  "/dashboard",
  "/orders/:path*",
  "/messages/:path*",
  "/wallet/:path*",
  "/profile/:path*",
  "/offers/:path*",
  "/referral/:path*",
  "/u/:path*",
  "/r/:path*",
  "/onboarding/:path*",
  "/login",
  "/register",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  async redirects() {
    return [
      ...APP_PATHS.map((source) => ({ source, destination: `${APP_URL}${source}`, permanent: false })),
      { source: "/sardorxon/admin", destination: `${ADMIN_URL}/`, permanent: false },
      { source: "/sardorxon/admin/:path*", destination: `${ADMIN_URL}/:path*`, permanent: false },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/api/:path*", destination: `${APP_URL}/api/:path*` }] };
  },
};

export default nextConfig;
