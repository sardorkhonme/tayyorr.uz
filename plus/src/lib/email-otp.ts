import { createHash, randomInt } from "crypto";

import { db } from "@/lib/db";
import { emailConfigured, otpEmail, sendEmail } from "@/lib/email";

/**
 * Email orqali ro'yxatdan o'tish / kirish — 4 xonali bir martalik kod.
 *  · kod 10 daqiqa amal qiladi, bazada faqat xeshi saqlanadi
 *  · bitta kodga 5 ta urinish, keyin yangi kod so'rash kerak
 *  · qayta yuborish — 60 soniyadan keyin, soatiga ko'pi bilan 5 ta
 */
export const OTP_LENGTH = 4;
const TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const HOUR = 60 * 60 * 1000;

export const emailSchemaMsg = "Email manzilini töğri kiriting";
export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200 ? e : null;
}

/** Ro'yxatdan to'liq o'tgan (login bor) hisob — yarim qolgan (profil to'ldirilmagan) hisob davom etaveradi. */
export async function emailHasAccount(email: string) {
  const u = await db.user.findUnique({ where: { email }, select: { login: true } });
  return !!u?.login;
}

function hash(email: string, code: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? ""}:${email}:${code}`)
    .digest("hex");
}

export type SendResult = { ok: true } | { ok: false; error: string; waitSec?: number };

export async function sendOtp(email: string): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "Email orqali röyxatdan ötiş vaqtinça işlamayapti — Google bilan davom eting" };

  const now = Date.now();
  const prev = await db.emailOtp.findUnique({ where: { email } });
  if (prev) {
    const since = now - prev.sentAt.getTime();
    if (since < RESEND_MS) {
      const waitSec = Math.ceil((RESEND_MS - since) / 1000);
      return { ok: false, error: `Yangi kodni ${waitSec} soniyadan keyin söraş mumkin`, waitSec };
    }
    const inWindow = now - prev.windowStart.getTime() < HOUR;
    if (inWindow && prev.sendCount >= MAX_SENDS_PER_HOUR) {
      return { ok: false, error: "Juda köp kod söraldi. Birozdan keyin qayta urinib köring" };
    }
  }

  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  const inWindow = prev && now - prev.windowStart.getTime() < HOUR;
  const data = {
    codeHash: hash(email, code),
    attempts: 0,
    expiresAt: new Date(now + TTL_MS),
    sentAt: new Date(now),
    sendCount: inWindow ? prev!.sendCount + 1 : 1,
    windowStart: inWindow ? prev!.windowStart : new Date(now),
  };
  await db.emailOtp.upsert({ where: { email }, create: { email, ...data }, update: data });

  try {
    await sendEmail({ to: email, ...otpEmail(code, email) });
  } catch (e) {
    console.error("[plus] otp email", e);
    // yuborilmagan kod hisobga kirmasin — qayta urinish mumkin bo'lsin
    await db.emailOtp.update({ where: { email }, data: { sentAt: new Date(0) } }).catch(() => {});
    return { ok: false, error: "Kod yuborilmadi. Email manzilini tekşirib, qayta urinib köring" };
  }
  return { ok: true };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "bad_code" | "expired" | "too_many" };

/** Kodni tekshiradi; to'g'ri bo'lsa — o'chiriladi (bir martalik). */
export async function verifyOtp(email: string, code: string): Promise<VerifyResult> {
  const row = await db.emailOtp.findUnique({ where: { email } });
  if (!row || row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  if (row.codeHash !== hash(email, code)) {
    await db.emailOtp.update({ where: { email }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: row.attempts + 1 >= MAX_ATTEMPTS ? "too_many" : "bad_code" };
  }
  // parallel so'rovda ikki marta ishlatilmasin
  const del = await db.emailOtp.deleteMany({ where: { email, codeHash: row.codeHash } });
  return del.count === 1 ? { ok: true } : { ok: false, reason: "expired" };
}
