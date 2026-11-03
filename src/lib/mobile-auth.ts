import { NextResponse } from "next/server";
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
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return mobileJson({ error: "Hisob topilmadi" }, { status: 401 });
  }
  return { userId };
}
