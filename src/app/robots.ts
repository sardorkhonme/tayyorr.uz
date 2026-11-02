import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { siteRole } from "@/lib/site";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // app.tayyorr.uz — shaxsiy kabinet, qidiruvga kirmaydi (landing — tayyorr.uz)
  if (siteRole((await headers()).get("host")) === "app") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/messages",
          "/wallet",
          "/profile",
          "/orders",
          "/onboarding",
          "/u/",
          "/r/",
          "/sardorxon",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
