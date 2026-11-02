import webpush from "web-push";
import { db } from "@/lib/db";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@tayyorr.uz";

let configured = false;
function ensure() {
  if (configured) return !!(PUB && PRIV);
  if (PUB && PRIV) {
    webpush.setVapidDetails(SUBJECT, PUB, PRIV);
    configured = true;
    return true;
  }
  return false;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export type PushSite = "uz" | "plus";

/**
 * Foydalanuvchining shu sayt(lar)dagi qurilmalariga push yuboradi.
 * "uz" — tayyorr.uz, "plus" — tayyorr+ (smm.tayyorr.uz); url shu sayt ichida ochiladi.
 */
export async function sendPushToUser(userId: string, payload: PushPayload, sites: PushSite[] = ["uz"]) {
  if (!ensure()) return;

  const subs = await db.pushSubscription.findMany({ where: { userId, site: { in: sites } } });
  if (!subs.length) return;

  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          data,
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 — obuna eskirgan, o'chiramiz
        if (code === 404 || code === 410) {
          await db.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        }
      }
    }),
  );
}
