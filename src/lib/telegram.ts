import { after } from "next/server";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID; // "@tayyorruz_works" yoki "-100..."
const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://tayyorr.uz"
).replace(/\/+$/, "");

const TYPE_LABEL: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs ishi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom ishi",
  OTHER: "Boshqa",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "🟢 Faol",
  IN_PROGRESS: "🔵 Jarayonda",
  DELIVERED: "📦 Topshirilgan",
  DONE: "✅ Tugallangan",
  CANCELLED: "❌ Bekor qilingan",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

function fmtDate(d: Date): string {
  return shortDateTime(d);
}

export interface ChannelOrder {
  id: string;
  title: string;
  type: string;
  description: string;
  budget: number | null;
  deadline: Date | null;
  status: string;
}

function buildText(o: ChannelOrder): string {
  const lines: string[] = [
    "🆕 <b>Yangi buyurtma</b>",
    "",
    `<b>${esc(clip(o.title, 200))}</b>`,
    "",
    `📌 <b>Holati:</b> ${STATUS_LABEL[o.status] ?? esc(o.status)}`,
    `📂 <b>Turi:</b> ${esc(TYPE_LABEL[o.type] ?? o.type)}`,
    o.budget
      ? `💰 <b>Byudjet:</b> ${o.budget.toLocaleString("ru-RU")} so'm`
      : "💰 <b>Byudjet:</b> kelishilgan holda",
  ];
  if (o.deadline) lines.push(`🗓 <b>Muddat:</b> ${esc(fmtDate(o.deadline))}`);
  lines.push(
    "",
    "📝 <b>Tavsif:</b>",
    esc(clip(o.description, 2500)),
    "",
    "— <i>tayyorr.uz</i>",
  );
  return lines.join("\n");
}

function keyboard(orderId: string) {
  return {
    inline_keyboard: [
      [{ text: "👁 Ishni ko'rish", url: `${SITE}/orders/${orderId}` }],
    ],
  };
}

async function tg(method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
}

/**
 * Yangi buyurtmani kanalga joylaydi va message_id ni saqlaydi.
 * Hech qachon xato tashlamaydi — sayt ishiga xalaqit bermaydi.
 */
export async function postOrderToChannel(order: ChannelOrder): Promise<void> {
  if (!TOKEN || !CHANNEL) return;

  const rec = (data: {
    telegramStatus: number;
    telegramSentAt?: Date | null;
    telegramError?: string | null;
    telegramMessageId?: number;
  }) =>
    db.order.update({ where: { id: order.id }, data }).catch(() => {});

  after(async () => {
    try {
      const res = await tg("sendMessage", {
        chat_id: CHANNEL,
        text: buildText(order),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: keyboard(order.id),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
      };
      if (res.ok && json.ok && json.result?.message_id) {
        await rec({
          telegramStatus: res.status,
          telegramSentAt: new Date(),
          telegramError: null,
          telegramMessageId: json.result.message_id,
        });
      } else {
        const err = (json.description || `HTTP ${res.status}`).slice(0, 300);
        console.error("[telegram] sendMessage not ok", res.status, err);
        await rec({ telegramStatus: res.status, telegramError: err });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[telegram] post error", msg);
      await rec({ telegramStatus: 0, telegramError: msg.slice(0, 300) });
    }
  });
}

/**
 * Buyurtma statusi (yoki ma'lumoti) o'zgarganda kanaldagi postni tahrirlaydi.
 */
export async function updateOrderChannelPost(orderId: string): Promise<void> {
  if (!TOKEN || !CHANNEL) return;
  after(async () => {
    try {
      const o = await db.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          budget: true,
          deadline: true,
          status: true,
          telegramMessageId: true,
          deletedAt: true,
        },
      });
      if (!o?.telegramMessageId || o.deletedAt) return;

      const res = await tg("editMessageText", {
        chat_id: CHANNEL,
        message_id: o.telegramMessageId,
        text: buildText(o),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: keyboard(o.id),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        // "message is not modified" — normal, e'tibor bermaymiz
        if (!body.includes("not modified")) {
          console.error("[telegram] editMessageText failed", res.status, body.slice(0, 300));
        }
      }
    } catch (e) {
      console.error("[telegram] edit error", e instanceof Error ? e.message : e);
    }
  });
}

/** Buyurtma o'chirilganda kanaldagi postni "o'chirilgan" holatiga keltiradi. */
export async function markOrderRemovedInChannel(
  messageId: number,
  title: string,
  by: string,
  reason?: string | null,
): Promise<void> {
  if (!TOKEN || !CHANNEL || !messageId) return;
  after(async () => {
    try {
      const lines = [
        "🗑 <b>Buyurtma o'chirildi</b>",
        "",
        `<s>${esc(clip(title, 200))}</s>`,
        "",
        `👤 <b>Kim o'chirdi:</b> ${esc(by)}`,
      ];
      if (reason?.trim()) lines.push(`✍️ <b>Sabab:</b> ${esc(clip(reason, 400))}`);
      lines.push("", "— <i>tayyorr.uz</i>");
      await tg("editMessageText", {
        chat_id: CHANNEL,
        message_id: messageId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (e) {
      console.error("[telegram] remove error", e instanceof Error ? e.message : e);
    }
  });
}

/** Diagnostika: konfiguratsiya + kanalga sinov xabari. */
export async function telegramSelfTest(): Promise<Record<string, unknown>> {
  const hasToken = !!TOKEN;
  const channel = CHANNEL ?? null;
  if (!hasToken || !channel) {
    return {
      ok: false,
      hasToken,
      channel,
      reason: "env yo'q (TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID)",
    };
  }
  try {
    const res = await tg("sendMessage", {
      chat_id: channel,
      text: "✅ tayyorr.uz — sinov xabari (Telegram ulanishi ishlayapti).",
      disable_web_page_preview: true,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, channel, response: json };
  } catch (e) {
    return { ok: false, channel, error: e instanceof Error ? e.message : String(e) };
  }
}
