import { after } from "next/server";

/**
 * Admin loglar guruhi — @tayyorrworkbot orqali (mavjud, kanalga buyurtma
 * joylaydigan bot), lekin endi Forum-guruhga, har bir voqea turi o'z
 * topikiga yoziladi. Sayt ishiga hech qachon xalaqit bermaydi (xato
 * bo'lsa jim o'tkaziladi) — HTTP so'rov `next/server`ning `after()`
 * orqali javob qaytargandan KEYIN yuboriladi, shuning uchun Telegram
 * sekinlashsa ham foydalanuvchi javobni kutib turmaydi.
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = process.env.TELEGRAM_LOG_GROUP_ID;
const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://tayyorr.uz"
).replace(/\/+$/, "");

const TOPICS = {
  registrations: process.env.TELEGRAM_TOPIC_REGISTRATIONS,
  orders: process.env.TELEGRAM_TOPIC_ORDERS,
  offers: process.env.TELEGRAM_TOPIC_OFFERS,
  contracts: process.env.TELEGRAM_TOPIC_CONTRACTS,
  payments: process.env.TELEGRAM_TOPIC_PAYMENTS,
  payouts: process.env.TELEGRAM_TOPIC_PAYOUTS,
  complaints: process.env.TELEGRAM_TOPIC_COMPLAINTS,
  completed: process.env.TELEGRAM_TOPIC_COMPLETED,
  errors: process.env.TELEGRAM_TOPIC_ERRORS,
  referrals: process.env.TELEGRAM_TOPIC_REFERRALS,
  support: process.env.TELEGRAM_TOPIC_SUPPORT,
  stars: process.env.TELEGRAM_TOPIC_STARS,
  // TayyorrSMM (smm.tayyorr.uz) orqali hamyonni to'ldirish
  smmTopups: process.env.TELEGRAM_TOPIC_SMM_TOPUPS || "499",
  // TayyorrSMM tizim (provayder balansi, narx sozlamalari)
  smmSystem: process.env.TELEGRAM_TOPIC_SMM_SYSTEM || "500",
} as const;

export type LogTopic = keyof typeof TOPICS;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function siteUrl(path: string): string {
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Foydalanuvchini guruh logida tanib olish uchun qisqa yorliq: "Ism Familiya · @login". */
export function userLabel(
  u:
    | {
        login?: string | null;
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
): string {
  if (!u) return "—";
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.name || "";
  const login = u.login ? `@${u.login}` : "";
  const parts = [full, login].filter(Boolean);
  return parts.join(" · ") || u.email || "—";
}

/**
 * Bitta voqeani mos topikka yozadi. `title` qalin qilib chiqadi, `lines`
 * pastda ro'yxat sifatida, `url` bo'lsa havola tugmasi qo'shiladi.
 */
export async function logToGroup(
  topic: LogTopic,
  title: string,
  lines: string[] = [],
  url?: string,
) {
  if (!TOKEN || !GROUP_ID) return;
  const threadId = TOPICS[topic];
  if (!threadId) return;

  const text =
    `<b>${esc(title)}</b>` + (lines.length ? `\n\n${lines.map(esc).join("\n")}` : "");

  after(async () => {
    try {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          message_thread_id: Number(threadId),
          text,
          parse_mode: "HTML",
          reply_markup: url
            ? { inline_keyboard: [[{ text: "Ko'rish", url }]] }
            : undefined,
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      /* jim o'tkazamiz — sayt ishiga xalaqit bermasin */
    }
  });
}
