"use server";

import { signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** O'chirilgan hisob sessiyasini tozalab, kirish sahifasiga. */
export async function signOutToLoginAction() {
  await signOut({ redirectTo: "/login" });
}
