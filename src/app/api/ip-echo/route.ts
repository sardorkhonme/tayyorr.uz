import { NextResponse } from "next/server";

/** VAQTINCHALIK: proksi orqali mijoz IP saqlanishini tekshirish uchun. */
export async function GET(req: Request) {
  const h = req.headers;
  return NextResponse.json({
    xff: h.get("x-forwarded-for"),
    real: h.get("x-real-ip"),
    vff: h.get("x-vercel-forwarded-for"),
    vip: h.get("x-vercel-ip-country"),
  });
}
