import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tayyorr.uz — prezentatsiya, kurs ishi, referat",
    short_name: "tayyorr.uz",
    description:
      "Prezentatsiya, kurs ishi, referat va diplom ishini buyurtma qiling yoki tayyorlab bering.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07070c",
    theme_color: "#07070c",
    lang: "uz",
    dir: "ltr",
    orientation: "portrait",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
