import { after } from "next/server";

/**
 * Real-time signallar (Ably). Bazaga yozilganda (lib/db.ts kengaytmasi) faqat tegishli odamning
 * kanaliga qisqa signal ketadi: "chat" | "wallet" | "order". Mazmun yuborilmaydi — brauzer signalni
 * olgach, ma'lumotni odatdagidek bizning API'dan so'raydi.
 *
 * ABLY_API_KEY bo'lmasa hech narsa qilmaydi — saytlar oldingidek so'rab turish bilan ishlaydi.
 * Bir xil fayl to'rt loyihada: src, admin, plus, smm-app (lib/realtime.ts).
 */
const KEY = process.env.ABLY_API_KEY || "";
const REST = "https://rest.ably.io";

export const realtimeEnabled = () => !!KEY;

/** Foydalanuvchining shaxsiy kanali */
export const userChannel = (userId: string) => `user-${userId}`;
/** Admin panel — barcha suhbatlar signali */
export const STAFF_CHANNEL = "staff";

export type Signal = { name: "chat" | "wallet" | "order"; data?: Record<string, string> };

const auth = () => `Basic ${Buffer.from(KEY).toString("base64")}`;

async function publish(channels: string[], s: Signal) {
  const res = await fetch(`${REST}/messages`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify([{ channels: channels.slice(0, 100), messages: { name: s.name, data: s.data ?? {} } }]),
  }).catch((e) => {
    console.error("realtime publish", e);
    return null;
  });
  if (res && !res.ok) console.error("realtime publish", res.status, await res.text().catch(() => ""));
}

/**
 * Signal yuborish — javob qaytgandan keyin (after), ya'ni tranzaksiya yopilib bo'lgach:
 * brauzer so'raganda yangi ma'lumot bazada bo'ladi.
 */
export function signal(
  channels: (string | null | undefined)[] | (() => Promise<(string | null | undefined)[]>),
  s: Signal,
) {
  if (!KEY) return;
  const run = async () => {
    const all = typeof channels === "function" ? await channels().catch(() => []) : channels;
    const list = [...new Set(all.filter((c): c is string => !!c))];
    if (list.length) await publish(list, s);
  };
  try {
    after(run);
  } catch {
    // so'rovdan tashqarida (skript va h.k.) — darhol
    void run();
  }
}

/** Brauzer uchun token: faqat berilgan kanallarni eshitish huquqi bilan (1 soat). */
export async function createRealtimeToken(clientId: string, channels: string[]) {
  if (!KEY) return null;
  const keyName = KEY.split(":")[0];
  const capability = Object.fromEntries(channels.map((c) => [c, ["subscribe"]]));
  const res = await fetch(`${REST}/keys/${encodeURIComponent(keyName)}/requestToken`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify({
      keyName,
      timestamp: Date.now(),
      ttl: 60 * 60 * 1000,
      capability: JSON.stringify(capability),
      clientId,
    }),
  });
  if (!res.ok) {
    console.error("realtime token", res.status, await res.text().catch(() => ""));
    return null;
  }
  const t = (await res.json()) as { token: string; expires: number };
  return { token: t.token, expires: t.expires, channels };
}
