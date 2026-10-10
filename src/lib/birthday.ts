import { z } from "zod";

import { db } from "@/lib/db";

/** Ro'yxatdan o'tishda qabul qilinadigan yosh oralig'i. */
export const MIN_AGE = 10;
export const MAX_AGE = 100;

/**
 * "YYYY-MM-DD" ko'rinishidagi tug'ilgan sana — haqiqiy kalendar sanasi
 * bo'lishi va yosh [MIN_AGE..MAX_AGE] oralig'ida bo'lishi shart.
 */
export const birthDateSchema = z
  .string({ required_error: "Tug'ilgan sanani kiriting" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tug'ilgan sanani kiriting")
  .transform((v, ctx) => {
    const [y, m, d] = v.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bunday sana yo'q" });
      return z.NEVER;
    }
    const now = new Date();
    let age = now.getUTCFullYear() - y;
    if (now.getUTCMonth() < m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() < d)) age--;
    if (age < MIN_AGE || age > MAX_AGE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Yosh ${MIN_AGE} dan ${MAX_AGE} gacha bo'lishi kerak`,
      });
      return z.NEVER;
    }
    return date;
  });

export { GOOGLE_BIRTHDAY_SCOPE, googleBirthdayEnabled } from "@/lib/birthday-scope";

interface GoogleDate {
  year?: number;
  month?: number;
  day?: number;
}

/** Google People API'dan tug'ilgan kun: "YYYY-MM-DD" yoki yilsiz "--MM-DD". Topilmasa null. */
export async function fetchGoogleBirthday(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://people.googleapis.com/v1/people/me?personFields=birthdays", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      birthdays?: { date?: GoogleDate; metadata?: { primary?: boolean } }[];
    };
    const list = (data.birthdays ?? []).filter((b) => b.date?.month && b.date?.day);
    const best = list.find((b) => b.metadata?.primary && b.date?.year) ?? list.find((b) => b.date?.year) ?? list[0];
    if (!best?.date) return null;
    const { year, month, day } = best.date;
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return year ? `${year}-${mm}-${dd}` : `--${mm}-${dd}`;
  } catch {
    return null;
  }
}

/** Google tug'ilgan kunini olib, foydalanuvchiga yozadi (xato bo'lsa jim). */
export async function saveGoogleBirthday(userId: string, accessToken: string | null | undefined) {
  if (!accessToken) return;
  const bday = await fetchGoogleBirthday(accessToken);
  if (bday) await db.user.update({ where: { id: userId }, data: { googleBirthday: bday } }).catch(() => {});
}

/** Admin va profil uchun: "2004-03-15" → "15-mart 2004", "--03-15" → "15-mart". */
const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
export function formatBirthday(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  const m = /^(\d{4}|--)-?(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  const day = Number(m[3]);
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return m[1] === "--" ? `${day}-${month}` : `${day}-${month} ${m[1]}`;
}

/** To'liq yil hisobida yosh (tug'ilgan sana Date bo'lsa). */
export function ageFrom(date: Date | null | undefined): number | null {
  if (!date) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  if (
    now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())
  )
    age--;
  return age;
}
