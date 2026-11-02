"use server";

import { revalidatePath } from "next/cache";

import { AccountError, saveAccount, type AccountInput } from "@/lib/account";
import { sessionUserId } from "@/lib/session";

export async function saveAccountAction(input: AccountInput): Promise<{ error?: string }> {
  const userId = await sessionUserId();
  if (!userId) return { error: "Avval kiring" };
  try {
    await saveAccount(userId, input, "Tayyorr SMM");
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    console.error("[smm] account", e);
    return { error: "Kutilmagan xatolik, qayta urinib ko'ring" };
  }
  revalidatePath("/", "layout");
  return {};
}
