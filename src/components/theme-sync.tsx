"use client";

import { useEffect } from "react";

import { writeThemeCookie } from "@/lib/theme";

/**
 * DB'dagi mavzu har doim ustuvor — foydalanuvchi qaysi qurilmadan kirsa
 * ham bir xil rejim ko'rinishi uchun, shu qurilmaning eski cookie'sini
 * ham qayta yozib qo'yadi (avval cookie ustuvor bo'lib, DB bilan
 * sinxron bo'lmagan qurilmalarda eski rejim qolib ketardi).
 */
export function ThemeSync({ serverTheme }: { serverTheme: string | null }) {
  useEffect(() => {
    if (serverTheme !== "light" && serverTheme !== "dark") return;

    const cur = document.documentElement.classList.contains("light")
      ? "light"
      : "dark";
    if (serverTheme !== cur) {
      document.documentElement.classList.toggle(
        "light",
        serverTheme === "light",
      );
    }
    // umumiy cookie (.tayyorr.uz) — tayyorr+ va Tayyorr SMM ham bazadagi rejimda oçiladi
    writeThemeCookie(serverTheme);
  }, [serverTheme]);
  return null;
}
