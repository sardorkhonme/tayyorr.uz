"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  async function handleRelogin() {
    setBusy(true);
    await signOut({ callbackUrl: "/login" });
  }

  const isUserNotFound =
    error.message?.includes("Wallet kodi yaratilmadi") ||
    error.message?.toLowerCase().includes("user") ||
    error.message?.toLowerCase().includes("record to update not found") ||
    error.message?.toLowerCase().includes("hisob");

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-[5rem] leading-none">
        {isUserNotFound ? "👤" : "⚠️"}
      </span>
      <h1 className="text-xl font-semibold text-white">
        {isUserNotFound ? "Bunday hisob mavjud emas" : "Nimadir noto'g'ri ketdi"}
      </h1>
      <p className="max-w-xs text-sm text-zinc-400">
        {isUserNotFound
          ? "Sizning hisobingiz tizimdan o'chirilgan yoki topilmadi. Qaytadan kirish uchun quyidagi tugmani bosing."
          : "Vaqtinchalik xatolik. Qaytadan urinib ko'ring yoki hisobdan chiqib qayta kiring."}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleRelogin}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Yo'naltirilmoqda..." : "Qayta urinish (Kirish)"}
        </button>
        {!isUserNotFound && (
          <button type="button" onClick={reset} className="btn-secondary">
            Qaytadan
          </button>
        )}
        <Link href="/" className="btn-ghost">
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
