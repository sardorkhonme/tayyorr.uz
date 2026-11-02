import type { Prisma } from "@prisma/client";

/** URL'dagi ?q= ni tozalab oladi (bo'sh bo'lsa ""). */
export function cleanQuery(q: string | string[] | undefined): string {
  return (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 100);
}

/**
 * Foydalanuvchini ism, familiya, ko'rinadigan ism, login yoki ID bo'yicha
 * topish sharti. Har bir so'z (bo'sh joy bilan ajratilgan) shu
 * maydonlardan birortasiga mos kelishi kerak — "Ali Valiyev" kabi to'liq
 * ism ham, "@ali" kabi login ham ishlaydi.
 */
export function userSearchWhere(q: string): Prisma.UserWhereInput {
  const tokens = q.replace(/^@/, "").split(/\s+/).filter(Boolean);
  return {
    AND: tokens.map((t) => ({
      OR: [
        { id: t },
        { login: { contains: t.replace(/^@/, ""), mode: "insensitive" } },
        { name: { contains: t, mode: "insensitive" } },
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
      ],
    })),
  };
}

/**
 * Yozuvning o'z ID'si (masalan chekdagi "Amal ID") bo'yicha: to'liq yoki
 * kamida 6 belgili boshlanishi. Qisqa so'rovlarda barcha cuid'lar mos kelib
 * qolmasligi uchun 6 belgidan kam bo'lsa shart qo'yilmaydi.
 */
export function idPrefixWhere(q: string): { id: { startsWith: string } } | null {
  const t = q.trim();
  return t.length >= 6 && !/\s/.test(t) ? { id: { startsWith: t } } : null;
}
