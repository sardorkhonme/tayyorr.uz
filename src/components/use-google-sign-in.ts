"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useFlashState } from "@/components/flash-status";

/** NextAuth `?error=` kodlari → tushunarli matn. */
const AUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "Bu email boşqa usul bilan röyxatdan ötgan. Login va parol bilan kiring.",
  OAuthSignin: "Google bilan kiriş boşlanmadi. Qayta urinib köring.",
  OAuthCallback: "Google javobini qayta işlab bölmadi. Qayta urinib köring.",
  OAuthCreateAccount: "Google hisobi bilan akkaunt yaratib bölmadi.",
  Callback: "Kiriş jarayonida xatolik. Qayta urinib köring.",
  AccessDenied: "Kirişga ruxsat berilmadi.",
  Configuration: "Kiriş vaqtinça işlamayapti. Birozdan söng urinib köring.",
  Verification: "Havola eskirgan yoki allaqaçon işlatilgan.",
  Default: "Kirişda xatolik yuz berdi. Qayta urinib köring.",
};

/**
 * Google orqali kiriş — tugma bosilgaç kutiş holati (yuklagiç), xato bölsa
 * tushunarli matn, va hech qachon abadiy "aylanib" qolmaydi: 20 s ichida
 * sahifa almaşmasa yoki brauzer «orqaga» bilan qaytarsa — holat tiklanadi.
 */
export function useGoogleSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFlashState<string | null>(null);

  // NextAuth xatosi bilan qaytgan bölsa (?error=...)
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("error");
      if (code) setError(AUTH_ERRORS[code] ?? AUTH_ERRORS.Default);
    } catch {
      /* e'tiborsiz */
    }
    // bfcache: Google sahifasidan «orqaga» qaytilganda tugma bloklanib qolmasin
    const onShow = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => {
      setBusy(false);
      setError("Google javob bermadi. Internetni tekşirib, qayta urinib köring.");
    }, 20_000);
    return () => clearTimeout(t);
  }, [busy]);

  const start = useCallback(async (callbackUrl: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("google", { callbackUrl });
      // redirect bölmasa (masalan provayder xatosi) — natijani körsatamiz
      if (res && typeof res === "object" && "error" in res && res.error) {
        setBusy(false);
        setError(AUTH_ERRORS[String(res.error)] ?? AUTH_ERRORS.Default);
      }
    } catch {
      setBusy(false);
      setError("Google bilan bog'lanib bölmadi. Internetni tekşirib, qayta urinib köring.");
    }
  }, []);

  return { busy, error, start };
}
