"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { completeProfile, ProfileError, type ProfileInput } from "@/lib/profile";
import { emailSchemaMsg, normalizeEmail, sendOtp } from "@/lib/email-otp";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";

export type AuthState = { error?: string; values?: Record<string, string>; sent?: boolean };

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
            ? "Bunday hisob topilmadi. Röyxatdan öting — bir daqiqa."
            : "Login/email yoki parol notöğri",
      };
    }
    throw e; // muvaffaqiyatli kirishdagi redirect
  }
}

/** Ro'yxatdan o'tishni yakunlash (Google orqali ochilgan hisob). */
export async function completeProfileAction(input: ProfileInput): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Avval kiring" };
  try {
    await completeProfile(session.user.id, input);
  } catch (e) {
    if (e instanceof ProfileError) return { error: e.message };
    console.error("[plus] complete", e);
    return { error: "Kutilmagan xatolik, qayta urinib köring" };
  }
  redirect("/?welcome=1");
}

/** 1-sahifa: email → 4 xonali kod yuboriladi → kod sahifasi. */
export async function sendOtpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = String(form.get("email") ?? "");
  const email = normalizeEmail(raw);
  if (!email) return { values: { email: raw }, error: emailSchemaMsg };
  const r = await sendOtp(email);
  // 60 soniya o'tmagan bo'lsa ham kod sahifasiga o'tkazamiz — oldingi kod hali amal qiladi
  if (!r.ok && !r.waitSec) return { values: { email: raw }, error: r.error };
  redirect(`/register/code?email=${encodeURIComponent(email)}`);
}

/** Kod sahifasidagi "Qayta yuborish". */
export async function resendOtpAction(rawEmail: string): Promise<{ ok: boolean; error?: string; waitSec?: number }> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: emailSchemaMsg };
  const r = await sendOtp(email);
  return r.ok ? { ok: true } : { ok: false, error: r.error, waitSec: r.waitSec };
}

/** 2-sahifa: kod to'g'ri bo'lsa — kiradi (yangi bo'lsa profil to'ldirishga o'tadi). */
export async function verifyOtpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 4) return { error: "4 xonali kodni kiriting" };
  try {
    await signIn("email-otp", { email, code, redirectTo: "/" });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      const c = (e as AuthError & { code?: string }).code;
      return {
        error:
          c === "expired"
            ? "Kod muddati tugagan. Yangi kod sörang"
            : c === "too_many"
              ? "Urinişlar köp böldi. Yangi kod sörang"
              : "Kod notöğri. Qayta tekşirib köring",
      };
    }
    throw e; // muvaffaqiyatli kirishdagi redirect
  }
}

/** "Parolni unutdim": emailga yangi parol havolasi. Hisob bor-yo'qligi oshkor qilinmaydi. */
export async function forgotAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const r = await requestPasswordReset(email);
  return r.ok ? { sent: true, values: { email } } : { error: r.error, values: { email } };
}

/** Yangi parol (2 marta) — saqlangach kirish sahifasiga qaytadi. */
export async function resetAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 6) return { error: "Parol kamida 6 belgidan iborat bölsin" };
  if (password.length > 100) return { error: "Parol juda uzun" };
  if (password !== confirm) return { error: "Parollar bir xil emas" };
  const r = await resetPassword(token, password);
  if (!r.ok) return { error: r.error };
  redirect("/login?reset=1");
}

export async function googleAction() {
  // yangi hisob bo'lsa kabinet /onboarding ga yo'naltiradi
  await signIn("google", { redirectTo: "/" });
}
