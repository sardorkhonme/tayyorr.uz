import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { putPublic, r2Configured } from "@/lib/r2";

/**
 * Akkaunt tahrirlash — app.tayyorr.uz dagi profil bilan bir xil maydonlar
 * (rasm, ism, familiya, tug'ilgan sana, o'zi haqida, login, parol).
 * Bu fayl plus/ va smm-app/ da bir xil.
 */
export class AccountError extends Error {}

export type AccountData = {
  avatar: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD yoki ""
  about: string;
  login: string;
  email: string;
  hasPassword: boolean;
};

export async function getAccount(userId: string): Promise<AccountData | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      image: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      about: true,
      login: true,
      email: true,
      passwordHash: true,
    },
  });
  if (!u) return null;
  return {
    avatar: u.avatarUrl ?? u.image ?? "",
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : "",
    about: u.about ?? "",
    login: u.login ?? "",
    email: u.email ?? "",
    hasPassword: !!u.passwordHash,
  };
}

const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tuğilgan sanani tanlang")
  .transform((v, ctx) => {
    const [y, m, d] = v.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || age < 10 || age > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tuğilgan sana notöğri" });
      return z.NEVER;
    }
    return date;
  });

const schema = z.object({
  avatar: z.string().optional(),
  firstName: z.string().trim().min(2, "Ism kamida 2 harf").max(50),
  lastName: z.string().trim().min(2, "Familiya kamida 2 harf").max(50),
  birthDate: z.union([z.literal(""), birthDate]).optional(),
  about: z.string().trim().max(1000).optional(),
  login: z
    .string()
    .trim()
    .min(3, "Login kamida 3 belgi")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Login faqat lotin harf, raqam, _ va . dan iborat bölsin"),
  newPassword: z.union([z.literal(""), z.string().min(6, "Parol kamida 6 belgi").max(100)]).optional(),
});

export type AccountInput = z.input<typeof schema>;

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

export async function saveAccount(userId: string, input: AccountInput, logLabel: string) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AccountError(parsed.error.issues[0]?.message ?? "Maʼlumotlarni tekşiring");
  const v = parsed.data;

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { login: true, avatarUrl: true, bannedUntil: true },
  });
  if (!me) throw new AccountError("Hisob topilmadi");
  if (me.bannedUntil && me.bannedUntil > new Date()) throw new AccountError("Hisobingiz vaqtinça çeklangan");

  if (v.login !== me.login) {
    const clash = await db.user.findFirst({
      where: { login: { equals: v.login, mode: "insensitive" }, NOT: { id: userId } },
      select: { id: true },
    });
    if (clash) throw new AccountError("Bu login band — boşqasini tanlang");
  }

  // rasm: yangi tanlangan bo'lsa (kichraytirilgan data URL) — R2 ga yuklanadi
  let avatarUrl: string | undefined;
  const m = v.avatar ? DATA_URL.exec(v.avatar) : null;
  if (m) {
    if (!r2Configured()) throw new AccountError("Rasm yuklaş vaqtinça işlamayapti");
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2 * 1024 * 1024) throw new AccountError("Rasm hajmi juda katta");
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    avatarUrl = await putPublic(`avatars/${Date.now()}-${randomUUID()}.${ext}`, new Uint8Array(buf), `image/${m[1]}`);
  }

  await db.user.update({
    where: { id: userId },
    data: {
      firstName: v.firstName,
      lastName: v.lastName,
      name: `${v.firstName} ${v.lastName}`,
      about: v.about ?? "",
      login: v.login,
      birthDate: v.birthDate ? v.birthDate : null,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(v.newPassword ? { passwordHash: await bcrypt.hash(v.newPassword, 10) } : {}),
    },
  });

  await db.activityLog
    .create({
      data: {
        userId,
        action: "PROFILE_UPDATE",
        summary: `${logLabel} da profilni tahrirladi${v.newPassword ? " (parol yangilandi)" : ""}`,
      },
    })
    .catch(() => {});
}
