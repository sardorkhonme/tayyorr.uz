import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { putPublic, r2Configured } from "@/lib/r2";
import { HEAR_ABOUT_US } from "@/lib/hear-about-us";
import { logRegistration, TERMS_VERSION } from "@/lib/register";

/**
 * tayyorr.uz dagi ro'yxatdan o'tish bilan bir xil maydonlar (rol bundan mustasno —
 * u tayyorr.uz ga birinchi kirganda so'raladi).
 */
const MIN_AGE = 10;
const MAX_AGE = 100;

const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tug'ilgan sanangizni tanlang")
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
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Yosh ${MIN_AGE} dan ${MAX_AGE} gacha bo'lishi kerak` });
      return z.NEVER;
    }
    return date;
  });

export const profileSchema = z
  .object({
    hearAboutUs: z.enum(HEAR_ABOUT_US.map((h) => h.value) as [string, ...string[]], {
      errorMap: () => ({ message: "Bizni qayerdan eshitganingizni tanlang" }),
    }),
    hearAboutUsDetail: z.string().trim().max(200).optional(),
    firstName: z.string().trim().min(2, "Ismingizni kiriting").max(50),
    lastName: z.string().trim().min(2, "Familiyangizni kiriting").max(50),
    birthDate,
    login: z
      .string()
      .trim()
      .min(3, "Login kamida 3 belgi")
      .max(30)
      .regex(/^[a-zA-Z0-9_.]+$/, "Login faqat lotin harf, raqam, _ va . dan iborat bo'lsin"),
    about: z.string().trim().min(5, "O'zingiz haqingizda kamida 5 belgi yozing").max(1000),
    avatar: z.string().min(1, "Profil rasmini yuklang"),
    password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lsin").max(100).optional(),
  })
  .refine((v) => v.hearAboutUs !== "other" || !!v.hearAboutUsDetail, {
    message: "Qayerdan eshitganingizni yozing",
    path: ["hearAboutUsDetail"],
  });

export type ProfileInput = z.input<typeof profileSchema>;

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

/** Rasm: kichraytirilgan data URL → R2, yoki Google'dagi mavjud rasm. */
async function resolveAvatar(avatar: string, allowedUrls: (string | null)[]) {
  const m = DATA_URL.exec(avatar);
  if (m) {
    if (!r2Configured()) throw new ProfileError("Rasm yuklash vaqtincha ishlamayapti");
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2 * 1024 * 1024) throw new ProfileError("Rasm hajmi juda katta");
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    return putPublic(`avatars/plus/${Date.now()}-${randomUUID()}.${ext}`, new Uint8Array(buf), `image/${m[1]}`);
  }
  if (allowedUrls.includes(avatar)) return avatar;
  throw new ProfileError("Profil rasmini yuklang");
}

export class ProfileError extends Error {}

function parse(input: ProfileInput) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new ProfileError(parsed.error.issues[0]?.message ?? "Barcha maydonlarni to'ldiring");
  return parsed.data;
}

async function loginTaken(login: string, exceptId?: string) {
  const u = await db.user.findFirst({
    where: { login: { equals: login, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return !!u;
}

const LOG_SELECT = {
  id: true,
  login: true,
  firstName: true,
  lastName: true,
  email: true,
  hearAboutUs: true,
  hearAboutUsDetail: true,
} as const;

/** Ro'yxatdan o'tishni yakunlash: Google yoki email bilan ochilgan, profili to'liq bo'lmagan hisob. */
export async function completeProfile(userId: string, input: ProfileInput) {
  const v = parse(input);
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, login: true, passwordHash: true, image: true, avatarUrl: true },
  });
  if (!me) throw new ProfileError("Hisob topilmadi");
  if (me.login) return; // allaqachon to'ldirilgan
  if (!me.passwordHash && !v.password) throw new ProfileError("Parol o'ylab toping");
  if (await loginTaken(v.login, userId)) throw new ProfileError("Bu login band — boshqasini tanlang");

  const avatarUrl = await resolveAvatar(v.avatar, [me.image, me.avatarUrl]);
  const user = await db.user.update({
    where: { id: userId },
    data: {
      login: v.login,
      firstName: v.firstName,
      lastName: v.lastName,
      name: `${v.firstName} ${v.lastName}`,
      birthDate: v.birthDate,
      about: v.about,
      avatarUrl,
      hearAboutUs: v.hearAboutUs,
      hearAboutUsDetail: v.hearAboutUs === "other" ? v.hearAboutUsDetail : null,
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      ...(v.password ? { passwordHash: await bcrypt.hash(v.password, 10) } : {}),
    },
    select: LOG_SELECT,
  });
  // parol ro'yxatdan o'tishda kiritilgan bo'lsa — email bilan ochilgan hisob
  await logRegistration(user, me.passwordHash ? "email" : "Google");
}
