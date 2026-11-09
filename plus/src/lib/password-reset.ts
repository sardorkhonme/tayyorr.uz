import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { emailConfigured, resetEmail, sendEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/email-otp";

/**
 * "Parolni unutdim": emailga bir martalik havola (30 daqiqa) — yangi parol sahifasi.
 * Token bazada faqat xesh ko'rinishida (VerificationToken, identifier "pwreset:<userId>").
 * Bunday email bilan hisob bor-yo'qligi oshkor qilinmaydi — javob doim bir xil.
 */
const TTL_MS = 30 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const PLUS_URL = (process.env.NEXT_PUBLIC_PLUS_URL || "https://plus.tayyorr.uz").replace(/\/+$/, "");

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
const ident = (userId: string) => `pwreset:${userId}`;

export async function requestPasswordReset(rawEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Email manzilini töğri kiriting" };
  if (!emailConfigured()) return { ok: false, error: "Parolni tiklaş vaqtinça işlamayapti. Support'ga yozing" };

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: true }; // hisob yo'q — oshkor qilmaymiz

  // 60 soniyada bir martadan ko'p yubormaymiz (yaratilgan vaqt = muddat - TTL)
  const last = await db.verificationToken.findFirst({
    where: { identifier: ident(user.id) },
    orderBy: { expires: "desc" },
  });
  if (last && last.expires.getTime() - TTL_MS > Date.now() - RESEND_MS) return { ok: true };

  const raw = randomBytes(32).toString("base64url");
  await db.verificationToken.deleteMany({ where: { identifier: ident(user.id) } });
  await db.verificationToken.create({
    data: { identifier: ident(user.id), token: hashToken(raw), expires: new Date(Date.now() + TTL_MS) },
  });
  try {
    await sendEmail({ to: email, ...resetEmail(`${PLUS_URL}/reset?token=${raw}`) });
  } catch (e) {
    console.error("[plus] reset email", e);
    return { ok: false, error: "Xat yuborilmadi. Birozdan keyin qayta urinib köring" };
  }
  return { ok: true };
}

/** Havola hali amal qiladimi (sahifani ko'rsatish uchun). */
export async function isResetTokenValid(raw: string) {
  if (!raw || raw.length < 20) return false;
  const row = await db.verificationToken.findUnique({ where: { token: hashToken(raw) } });
  return !!row && row.identifier.startsWith("pwreset:") && row.expires > new Date();
}

export async function resetPassword(raw: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = hashToken(raw || "");
  const row = await db.verificationToken.findUnique({ where: { token } });
  if (!row || !row.identifier.startsWith("pwreset:") || row.expires < new Date()) {
    return { ok: false, error: "Havola eskirgan yoki allaqaçon işlatilgan. Yangisini sörang" };
  }
  // bir martalik: parallel so'rovda ikki marta ishlatilmasin
  const del = await db.verificationToken.deleteMany({ where: { token } });
  if (del.count !== 1) return { ok: false, error: "Havola allaqaçon işlatilgan" };

  const userId = row.identifier.slice("pwreset:".length);
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await db.verificationToken.deleteMany({ where: { identifier: ident(userId) } });
  await db.activityLog
    .create({ data: { userId, action: "PASSWORD_RESET", summary: "Parolni email orqali tikladi (tayyorr+)" } })
    .catch(() => {});
  return { ok: true };
}
