"use client";

import { useCallback, useEffect, useState } from "react";

import { Mascot } from "@/components/mascot";

/**
 * Internet uzilganda — butun ekran ustida «Internet yöq» kartasi (Tayyor-Man).
 * `navigator.onLine` + `offline`/`online` hodisalari; aloqa tiklanişi bilan
 * özi yopiladi. Mavzu (yorug'/qorong'i) — body fonining yorqinligidan
 * aniqlanadi, şuning uçun app.tayyorr.uz, plus va smm-app da bir xil işlaydi.
 * Bu fayl uçala saytda bir xil.
 */

const IMG = "/mascot/no-internet.webp";

function isDarkPage(): boolean {
  try {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return false;
    const [r, g, b] = m.map(Number);
    if (m.length >= 4 && Number(m[3]) === 0) return false; // shaffof fon
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  } catch {
    return false;
  }
}

export function OfflineOverlay() {
  const [offline, setOffline] = useState(false);
  const [dark, setDark] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stillOff, setStillOff] = useState(false);

  useEffect(() => {
    // rasm oldindan keşga olinadi — aloqa uzilganda ham körinsin
    const pre = new Image();
    pre.src = IMG;

    const goOff = () => {
      setDark(isDarkPage());
      setStillOff(false);
      setOffline(true);
    };
    const goOn = () => {
      setOffline(false);
      setChecking(false);
      setStillOff(false);
    };
    if (typeof navigator !== "undefined" && navigator.onLine === false) goOff();
    window.addEventListener("offline", goOff);
    window.addEventListener("online", goOn);
    return () => {
      window.removeEventListener("offline", goOff);
      window.removeEventListener("online", goOn);
    };
  }, []);

  const retry = useCallback(async () => {
    setChecking(true);
    setStillOff(false);
    try {
      const res = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
      if (res.status < 500) {
        setOffline(false);
        window.location.reload();
        return;
      }
      setStillOff(true);
    } catch {
      setStillOff(true);
    } finally {
      setChecking(false);
    }
  }, []);

  if (!offline) return null;

  const c = dark
    ? { card: "#16161e", line: "rgba(255,255,255,0.08)", fg: "#f2f2f5", soft: "#a1a1ad", shade: "rgba(5,5,10,0.72)" }
    : { card: "#ffffff", line: "#ececf3", fg: "#16161d", soft: "#6b6b78", shade: "rgba(20,20,35,0.45)" };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-title"
      aria-describedby="offline-desc"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: c.shade,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 24,
          border: `1px solid ${c.line}`,
          background: c.card,
          color: c.fg,
          padding: "28px 24px 24px",
          textAlign: "center",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Mascot pose="no-internet" size={190} priority />
        <h2 id="offline-title" style={{ margin: "12px 0 0", fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: c.fg }}>
          Internet yöq
        </h2>
        <p id="offline-desc" style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.55, color: c.soft, maxWidth: 300 }}>
          Aloqani tekşiring — ulanişi bilan sahifa davom etadi.
        </p>
        {stillOff && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#ef4444" }}>Hali ham aloqa yöq.</p>
        )}
        <button
          type="button"
          onClick={retry}
          disabled={checking}
          style={{
            marginTop: 20,
            width: "100%",
            border: "none",
            borderRadius: 14,
            padding: "12px 18px",
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(180deg,#6366f1,#4f46e5)",
            cursor: checking ? "default" : "pointer",
            opacity: checking ? 0.7 : 1,
          }}
        >
          {checking ? "Tekşirilmoqda…" : "Qayta urinib köriş"}
        </button>
      </div>
    </div>
  );
}
