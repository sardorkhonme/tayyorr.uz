import type { MetadataRoute } from "next";

/** app.tayyorr.uz — shaxsiy kabinet, qidiruvga kirmaydi (ochiq sahifalar — tayyorr.uz landingda). */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
