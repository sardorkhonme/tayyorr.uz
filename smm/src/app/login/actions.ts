"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      identifier: String(form.get("identifier") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return {
        error:
          code === "no_account"
            ? "Bunday hisob mavjud emas. Avval tayyorr.uz da ro'yxatdan o'ting."
            : "Login/email yoki parol noto'g'ri",
      };
    }
    throw e; // muvaffaqiyatli kirishdagi redirect
  }
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/" });
}
