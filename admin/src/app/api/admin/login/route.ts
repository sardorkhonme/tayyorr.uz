import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_COOKIE,
  checkAdminCredentials,
  createAdminToken,
} from "@/lib/admin";

const schema = z.object({ login: z.string(), password: z.string() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const { login, password } = parsed.data;
  if (!checkAdminCredentials(login, password)) {
    return NextResponse.json({ error: "Login yoki parol xato" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
