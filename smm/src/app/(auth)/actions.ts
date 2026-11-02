"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { logRegistration, TERMS_VERSION } from "@/lib/register";

export type AuthState = { error?: string; values?: Record<string, string> };

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "");
  try {
    await signIn("credentials", {
      identifier,
      password: String(form.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return {
        values: { identifier },
        error:
          code === "no_account"
            ? "Bunday hisob topilmadi. Ro'yxatdan o'ting — bir daqiqa."
            : "Login/email yoki parol noto'g'ri",
      };
    }
    throw e; // muvaffaqiyatli kirishdagi redirect
  }
}

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Ismingizni kiriting").max(50),
  email: z.string().trim().toLowerCase().email("Email manzil noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lsin").max(100),
});

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = {
    firstName: String(form.get("firstName") ?? ""),
    email: String(form.get("email") ?? ""),
  };
  // bot tuzog'i — odam bu maydonni ko'rmaydi
  if (String(form.get("website") ?? "")) return { values };

  const parsed = registerSchema.safeParse({ ...values, password: String(form.get("password") ?? "") });
  if (!parsed.success) return { values, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  const { firstName, email, password } = parsed.data;

  const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { values, error: "Bu email bilan hisob allaqachon bor — «Kirish» bo'limidan kiring" };

  const user = await db.user
    .create({
      data: {
        firstName,
        name: firstName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    })
    .catch(() => null);
  if (!user) return { values, error: "Bu email bilan hisob allaqachon bor — «Kirish» bo'limidan kiring" };

  await logRegistration(user, "email");
  await signIn("credentials", { identifier: email, password, redirectTo: "/?welcome=1" });
  return {};
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/" });
}
