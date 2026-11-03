"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { completeProfile, ProfileError, type ProfileInput } from "@/lib/profile";

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

export async function googleAction() {
  // yangi hisob bo'lsa kabinet /onboarding ga yo'naltiradi
  await signIn("google", { redirectTo: "/" });
}
