import { signInternal } from "@/lib/sso";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "");

/**
 * Mobil ilovaga (FCM) push — app.tayyorr.uz orqali (Firebase kaliti faqat o'sha loyihada).
 * Bu fayl plus/ va smm-app/ da deyarli bir xil (faqat scope farq qiladi). Xato bo'lsa jim o'tadi.
 */
export async function sendMobileNotice(
  userId: string,
  conversationId: string,
  supportId: string,
  title: string,
  body: string,
): Promise<void> {
  const p = JSON.stringify({
    userId,
    title,
    body: body.slice(0, 200),
    conversationId,
    data: { otherId: supportId, name: title, login: "tayyorr_support", image: "", support: "1", scope: "plus" },
  });
  const ts = Date.now();
  try {
    const sig = await signInternal(`mobile-push.${ts}.${p}`);
    await fetch(`${APP_URL}/api/internal/mobile-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p, ts, sig }),
      cache: "no-store",
    });
  } catch {
    /* push — ikkinchi darajali */
  }
}
