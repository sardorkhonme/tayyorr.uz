import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "tyr_admin";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const secret = process.env.AUTH_SECRET || "dev-secret";

export const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "sardorxon006";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "sardorxon006";

function sign(data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createAdminToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (sign(payload) !== sig) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function checkAdminCredentials(login: string, password: string) {
  return login === ADMIN_LOGIN && password === ADMIN_PASSWORD;
}

/** Server komponent / route handler ichida: admin sessiyasi bormi? */
export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return verifyAdminToken(c.get(ADMIN_COOKIE)?.value);
}

/** Admin sahifalari uchun: bo'lmasa login sahifasiga yo'naltiradi. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

/** Admin API route'lari uchun: bo'lmasa 401 javob, aks holda null. */
export async function adminApiGuard() {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "Admin huquqi kerak" }, { status: 401 });
}
