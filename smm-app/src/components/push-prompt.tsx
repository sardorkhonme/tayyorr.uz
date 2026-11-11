"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
/** "Keyinroq" bosilgach 3 kun qayta so'ralmaydi */
const SNOOZE_KEY = "smm_push_snooze";
const SNOOZE_MS = 3 * 24 * 3600 * 1000;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys }),
  });
}

/** Bildirishnomaga ruxsat so'rash — sayt yopiq bo'lsa ham support javoblari va buyurtma holati keladi. */
export function PushPrompt() {
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "unsupported" | NotificationPermission>("loading");
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !VAPID) {
      setState("unsupported");
      return;
    }
    setDismissed(Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS);
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        setState(Notification.permission);
        if (Notification.permission === "granted") subscribe().catch(() => {});
      })
      .catch(() => setState("unsupported"));
  }, []);

  function later() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setState(perm);
      if (perm === "granted") await subscribe();
      else later();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  if (state !== "default" || dismissed || pathname === "/support" || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-zinc-900/30 p-4 backdrop-blur-sm" onClick={later}>
      <div
        className="animate-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="shine mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
          <Icon name="bell" className="h-7 w-7" />
        </span>
        <h3 className="mt-5 font-display text-xl font-bold text-zinc-900">Bildirişnomalarni yoqasizmi?</h3>
        <p className="mt-2 leading-relaxed text-zinc-500">
          Buyurtmalaringiz holati va support javoblari haqida sayt yopiq bölsa ham darhol xabar olasiz.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="btn-primary flex-1 !py-3.5" onClick={enable} disabled={busy}>
            {busy ? "…" : "Yoqiş"}
          </button>
          <button type="button" className="btn-ghost flex-1 !py-3.5" onClick={later} disabled={busy}>
            Keyinroq
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
