/**
 * tayyorr.uz admin log guruhi (o'sha bot) — tayyorr+ topiklari.
 * Xato bo'lsa jim o'tkaziladi — sayt ishiga xalaqit bermaydi.
 */
const TOPICS = {
  // tayyorr.uz dagi "Ro'yxatdan o'tish" topigi
  registrations: process.env.TELEGRAM_TOPIC_REGISTRATIONS || "3",
  // tayyorr.uz dagi "Support" topigi
  support: process.env.TELEGRAM_TOPIC_SUPPORT || "35",
  // SMM buyurtmalar
  orders: process.env.TELEGRAM_TOPIC_SMM_ORDERS || "498",
  // SMM tizim balansi (provayder): to'ldirish, yechilish, ogohlantirishlar
  system: process.env.TELEGRAM_TOPIC_SMM_SYSTEM || "500",
} as const;

export type SmmTopic = keyof typeof TOPICS;

const ADMIN_URL = (process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz") + "/sardorxon/admin";

export function adminUserUrl(userId: string) {
  return `${ADMIN_URL}/users/${userId}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function userLabel(u: {
  login?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
} | null) {
  if (!u) return "—";
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.name || "";
  return [full, u.login ? `@${u.login}` : ""].filter(Boolean).join(" · ") || u.email || "—";
}

export async function notifyAdmins(
  topic: SmmTopic,
  title: string,
  lines: string[] = [],
  url?: { text: string; href: string },
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_GROUP_ID;
  if (!token || !chatId) return false;

  const body = lines.filter(Boolean);
  const text = `<b>${esc(title)}</b>` + (body.length ? `\n\n${body.map(esc).join("\n")}` : "");
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: Number(TOPICS[topic]),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(url ? { reply_markup: { inline_keyboard: [[{ text: url.text, url: url.href }]] } } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
