import { NextResponse } from "next/server";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";

/**
 * tayyorr.uz mobil ilovasidan WebView'da kirish: /app-login?ticket=… —
 * bir martalik kalit bilan sessiya ochib, bosh sahifaga yo'naltiradi.
 * Kalit yaroqsiz bo'lsa — oddiy kirish sahifasi.
 */
export async function GET(req: Request) {
  const ticket = new URL(req.url).searchParams.get("ticket") ?? "";
  try {
    await signIn("app-ticket", { ticket, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.redirect(new URL("/login", req.url));
    throw e; // muvaffaqiyatli kirishdagi redirect
  }
  return NextResponse.redirect(new URL("/", req.url));
}
