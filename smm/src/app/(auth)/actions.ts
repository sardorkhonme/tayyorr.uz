"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { completeProfile, ProfileError, registerWithEmail, type ProfileInput } from "@/lib/profile";

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

/** Email + parol bilan to'liq ro'yxatdan o'tish (tayyorr.uz dagi maydonlar, rolsiz). */
export async function registerAction(input: ProfileInput): Promise<AuthState> {
  let creds: { email: string; password: string };
  try {
    creds = await registerWithEmail(input);
  } catch (e) {
    if (e instanceof ProfileError) return { error: e.message };
    console.error("[plus] register", e);
    return { error: "Kutilmagan xatolik, qayta urinib ko'ring" };
  }
  await signIn("credentials", { identifier: creds.email, password: creds.password, redirectTo: "/?welcome=1" });
  return {};
}

/** Google orqali kirgan hisobning profilini to'ldirish. */
export async function completeProfileAction(input: ProfileInput): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Avval kiring" };
  try {
    await completeProfile(session.user.id, input);
  } catch (e) {
    if (e instanceof ProfileError) return { error: e.message };
    console.error("[plus] complete", e);
    return { error: "Kutilmagan xatolik, qayta urinib ko'ring" };
  }
  redirect("/?welcome=1");
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/" });
}
