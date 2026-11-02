import { signInternal } from "@/lib/sso";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "");

export type ClickReceiptResult = { ok: true; qrCodeURL: string } | { ok: false; error: string };

/**
 * Click rasmiy (fiskal) cheki — app.tayyorr.uz dan imzolangan server-server so'rov bilan
 * olinadi: Click maxfiy kaliti faqat o'sha loyihada turadi. Bu fayl plus/ va smm-app/ da bir xil.
 */
export async function requestClickReceipt(id: string, userId: string): Promise<ClickReceiptResult> {
  const ts = Date.now();
  const sig = await signInternal(`click-ofd.${id}.${userId}.${ts}`);
  try {
    const res = await fetch(`${APP_URL}/api/internal/click-ofd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId, ts, sig }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.qrCodeURL !== "string") {
      return { ok: false, error: data.error || "Chekni olib bo'lmadi" };
    }
    return { ok: true, qrCodeURL: data.qrCodeURL };
  } catch {
    return { ok: false, error: "Chek xizmati vaqtincha ishlamayapti" };
  }
}
