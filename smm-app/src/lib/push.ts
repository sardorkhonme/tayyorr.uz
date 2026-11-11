import webpush from "web-push";

import { db } from "@/lib/db";

/**
 * tayyorr+ brauzer bildirishnomalari — tayyorr.uz bilan bir xil VAPID kalitlar
 * (support javoblari tayyorr.uz serveridan ham shu obunalarga yuboriladi).
 * Obunalar umumiy jadvalda, `site: "smm"`.
 */
const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@tayyorr.uz";

let configured = false;
function ensure() {
  if (!configured && PUB && PRIV) {
    webpush.setVapidDetails(SUBJECT, PUB, PRIV);
    configured = true;
  }
  return configured;
}

export async function sendSmmPush(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!ensure()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId, site: "smm" } });
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 — obuna eskirgan
        if (code === 404 || code === 410) {
          await db.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
        }
      }
    }),
  );
}
