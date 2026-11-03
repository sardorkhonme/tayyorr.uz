import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tayyorr.uz — prezentatsiya, kurs işi, referat",
    short_name: "tayyorr.uz",
    description:
      "Prezentatsiya, kurs işi, referat va diplom işini buyurtma qiling yoki tayyorlab bering.",
    start_url: "/dashboard",
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
