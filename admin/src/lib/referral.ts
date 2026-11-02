import { db } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkash belgilar yo'q (0/O, 1/I)

function randomCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

/** Yangi tashrif havolasi yaratadi, kodi noyob bo'lguncha qayta urinadi. */
export async function createReferralLink(name: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      return await db.referralLink.create({ data: { name, code } });
    } catch {
      // unique to'qnashuvi — qayta urinamiz
    }
  }
  throw new Error("Havola kodi yaratilmadi");
}

export function referralUrl(code: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";
  return `${site.replace(/\/+$/, "")}/r/${code}`;
}
