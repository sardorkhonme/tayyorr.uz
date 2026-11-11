import { NextResponse, after } from "next/server";
import jwt from "jsonwebtoken";

import { db } from "@/lib/db";
import { mobileJson } from "@/lib/mobile-cors";

/**
 * Flutter ilovasi uchun alohida autentifikatsiya — NextAuth'ning
 * cookie-asosidagi sessiyasidan farqli, oddiy Bearer JWT. Ilova
 * /api/mobile/auth/login orqali token oladi, keyin har bir so'rovda
 * "Authorization: Bearer <token>" header bilan yuboradi. Saytning
 * o'zi (web) buni ishlatmaydi — u NextAuth sessiyasida qolaveradi.
 */
const SECRET = process.env.MOBILE_JWT_SECRET || "";
const EXPIRES_IN = "30d";

export function signMobileToken(userId: string): string {
  if (!SECRET) throw new Error("MOBILE_JWT_SECRET yöq");
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyMobileToken(token: string): string | null {
  if (!SECRET) return null;
  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}

/** Toshkent sanasi "YYYY-MM-DD". */
const tashkentDay = () => new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
const tracked = new Map<string, string>();

/**
 * Mobil ilovadan foydalanish statistikasi: har foydalanuvchi uchun kuniga bir marta (shu server nusxasida)
 * MobileDay qatori + mobileFirstAt / mobileLastAt. Javobni kechiktirmaydi (after).
 */
const seenAt = new Map<string, number>();
/** Onlayn holati (lastSeenAt) — ilova so'rovlarida, foydalanuvchi uchun daqiqada ko'pi bilan bir marta. */
function touchPresence(userId: string) {
  const now = Date.now();
  if (now - (seenAt.get(userId) ?? 0) < 60_000) return;
  if (seenAt.size > 20000) seenAt.clear();
  seenAt.set(userId, now);
  const job = () => db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date(now) } }).then(() => {});
  try {
    after(() => job().catch(() => {}));
  } catch {
    void job().catch(() => {});
  }
}

function trackMobile(userId: string) {
  touchPresence(userId);
  const day = tashkentDay();
  if (tracked.get(userId) === day) return;
  if (tracked.size > 20000) tracked.clear();
  tracked.set(userId, day);
  const job = async () => {
    const now = new Date();
    await db.mobileDay.createMany({ data: [{ userId, day: new Date(`${day}T00:00:00Z`), firstAt: now }], skipDuplicates: true });
    await db.user.update({ where: { id: userId }, data: { mobileLastAt: now } });
    await db.user.updateMany({ where: { id: userId, mobileFirstAt: null }, data: { mobileFirstAt: now } });
  };
  try {
    after(() => job().catch(() => {}));
  } catch {
    void job().catch(() => {});
  }
}

const KNOWN_TTL = 5 * 60 * 1000;
const known = new Map<string, number>();

/**
 * Mobil API route'lari uchun himoya: Authorization header'dan userId'ni
 * chiqaradi. Muvaffaqiyatsiz bo'lsa tayyor 401 javobini qaytaradi —
 * chaqiruvchi shuni tekshiradi (agar Response bo'lsa — darhol qaytaradi).
 */
export async function requireMobileAuth(
  req: Request,
): Promise<{ userId: string } | NextResponse> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return mobileJson({ error: "Avval kiring" }, { status: 401 });
  }
  const userId = verifyMobileToken(token);
  if (!userId) {
    return mobileJson({ error: "Sessiya eskirgan, qayta kiring" }, { status: 401 });
  }
  // hisob borligi — har so'rovda bazadan so'ramaslik uchun qisqa kesh (ilova har necha soniyada so'raydi)
  const seen = known.get(userId);
  if (!seen || Date.now() - seen > KNOWN_TTL) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      known.delete(userId);
      return mobileJson({ error: "Hisob topilmadi" }, { status: 401 });
    }
    if (known.size > 5000) known.clear();
    known.set(userId, Date.now());
  }
  trackMobile(userId);
  return { userId };
}
