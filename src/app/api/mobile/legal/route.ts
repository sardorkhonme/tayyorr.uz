import { mobileJson } from "@/lib/mobile-cors";
import { PRIVACY, PRIVACY_INTRO, PRIVACY_UPDATED } from "@/lib/privacy";
import { TERMS, TERMS_INTRO, TERMS_VERSION } from "@/lib/terms";

export { OPTIONS } from "@/lib/mobile-cors";

/** Ommaviy oferta va maxfiylik siyosati — ilova ichida ko'rsatish uchun (saytdagi /terms, /privacy bilan bir xil). */
export async function GET(req: Request) {
  const doc = new URL(req.url).searchParams.get("doc");
  if (doc === "privacy") {
    return mobileJson({ title: "Maxfiylik siyosati", updated: PRIVACY_UPDATED, intro: PRIVACY_INTRO, sections: PRIVACY });
  }
  return mobileJson({ title: "Ommaviy oferta va foydalaniş şartlari", updated: TERMS_VERSION, intro: TERMS_INTRO, sections: TERMS });
}
