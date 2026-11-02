import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import { db } from "@/lib/db";

/**
 * Mobil ilovaga FCM push. Server kaliti FIREBASE_SERVICE_ACCOUNT
 * (service account JSON, base64) muhit o'zgaruvchisida saqlanadi.
 */
function messaging() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    if (!getApps().length) {
      const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      initializeApp({ credential: cert(json) });
    }
    return getMessaging();
  } catch (e) {
    console.error("FCM sozlanmadi:", e);
    return null;
  }
}

export interface MobilePush {
  title: string;
  body: string;
  /** ilova bosilganda ochadigan suhbat va bildirishnomalarni guruhlash */
  conversationId: string;
  data?: Record<string, string>;
}

/** Foydalanuvchining barcha mobil qurilmalariga push yuboradi. */
export async function sendMobilePush(userId: string, p: MobilePush) {
  const m = messaging();
  if (!m) return;
  const tokens = (await db.deviceToken.findMany({ where: { userId }, select: { token: true } })).map((t) => t.token);
  if (!tokens.length) return;

  const res = await m.sendEachForMulticast({
    tokens,
    notification: { title: p.title, body: p.body },
    data: { type: "message", conversationId: p.conversationId, ...p.data },
    android: {
      priority: "high",
      notification: {
        // ilovadagi kanal: "Yangi xabarlar", "tin" ovozi bilan
        channelId: "messages_tin_v1",
        sound: "tin",
        icon: "ic_stat_message",
        color: "#6366F1",
        // bitta suhbatdan kelganlari bitta bildirishnomaga yig'iladi
        tag: p.conversationId,
        defaultVibrateTimings: true,
      },
    },
  });

  // eskirgan / o'chirilgan tokenlarni tozalaymiz
  const dead = res.responses
    .map((r, i) =>
      !r.success &&
      ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(
        r.error?.code ?? "",
      )
        ? tokens[i]
        : null,
    )
    .filter((t): t is string => !!t);
  if (dead.length) await db.deviceToken.deleteMany({ where: { token: { in: dead } } });
}
