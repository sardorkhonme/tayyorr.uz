import { after } from "next/server";

import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

const TOKEN = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_NOTIFY_BOT_USERNAME || "tayyorr_xabarnoma_bot";

/** Botning ochiq (hammaga bir xil) manzili — akkaunt ulash email+kod orqali botning o'zida sodir bo'ladi. */
export function botLink(): string {
  return `https://t.me/${BOT_USERNAME}`;
}

export async function tg(method: string, body: Record<string, unknown>) {
  if (!TOKEN) return null;
  try {
    return await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Botdan chatId'ga oddiy matnli xabar yuboradi. */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  reply_markup?: Record<string, unknown>,
) {
  return tg("sendMessage", { chat_id: chatId, text, reply_markup });
}

export interface TelegramNotifyPayload {
  title: string;
  body: string;
  url?: string; // saytdagi to'liq havola (masalan `${SITE}/messages/123`)
  buttonLabel?: string;
}

/**
 * Bitta foydalanuvchiga shaxsiy bildirishnoma botidan xabar yuboradi.
 * Foydalanuvchi botga ulanmagan bo'lsa — jim o'tkazib yuboriladi. Butun
 * ish (DB qidiruv + Telegram so'rov) `after()` orqali javob qaytgandan
 * KEYIN bajariladi — foydalanuvchi Telegram sekinlashini kutmaydi.
 */
export async function sendTelegramToUser(userId: string, payload: TelegramNotifyPayload) {
  if (!TOKEN) return;

  after(async () => {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true },
      });
      if (!user?.telegramChatId) return;

      const text = `<b>${esc(payload.title)}</b>\n\n${esc(payload.body)}`;
      const reply_markup = payload.url
        ? {
            inline_keyboard: [
              [{ text: payload.buttonLabel || "Köriş", url: payload.url }],
            ],
          }
        : undefined;

      const res = await tg("sendMessage", {
        chat_id: user.telegramChatId,
        text,
        parse_mode: "HTML",
        reply_markup,
      });

      // 403 — foydalanuvchi botni bloklagan yoki chatni o'chirgan: chatId'ni
      // tozalaymiz (xabar yubormaymiz), lekin username va qachon bloklaganini
      // admin ko'rishi uchun saqlab qolamiz.
      if (res && res.status === 403) {
        await db.user
          .update({
            where: { id: userId },
            data: { telegramChatId: null, telegramBlockedAt: new Date() },
          })
          .catch(() => {});
      }
    } catch {
      /* jim o'tkazamiz — sayt ishiga xalaqit bermasin */
    }
  });
}

/** Bir nechta foydalanuvchiga bitta xabarni yuboradi (parallel). */
export async function sendTelegramToUsers(
  userIds: string[],
  payload: TelegramNotifyPayload,
) {
  await Promise.all(userIds.map((id) => sendTelegramToUser(id, payload)));
}

export function siteUrl(path: string): string {
  return absoluteUrl(path);
}
