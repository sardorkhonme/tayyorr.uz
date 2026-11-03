"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { AccountError, saveAccount, type AccountInput } from "@/lib/account";

export async function saveAccountAction(input: AccountInput): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Avval kiring" };
  try {
    await saveAccount(session.user.id, input, "tayyorr+");
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    console.error("[plus] account", e);
    return { error: "Kutilmagan xatolik, qayta urinib köring" };
  }
  revalidatePath("/", "layout");
  return {};
}
