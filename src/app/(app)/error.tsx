"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot } from "@/components/mascot";

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
    window.location.href = "/api/sso/logout";
  }

  const isUserNotFound =
    error.message?.includes("Wallet kodi yaratilmadi") ||
    error.message?.toLowerCase().includes("user") ||
    error.message?.toLowerCase().includes("record to update not found") ||
    error.message?.toLowerCase().includes("hisob");

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <Mascot pose={isUserNotFound ? "not-found" : "error"} size={260} priority className="mascot-big" />
      <h1 className="text-xl font-semibold text-white">
        {isUserNotFound ? "Bunday hisob mavjud emas" : "Nimadir notöğri ketdi"}
      </h1>
      <p className="max-w-xs text-sm text-zinc-400">
        {isUserNotFound
          ? "Sizning hisobingiz tizimdan öçirilgan yoki topilmadi. Qaytadan kiriş uçun quyidagi tugmani bosing."
          : "Vaqtinçalik xatolik. Qaytadan urinib köring yoki hisobdan çiqib qayta kiring."}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleRelogin}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Yönaltirilmoqda..." : "Qayta uriniş (Kiriş)"}
        </button>
        {!isUserNotFound && (
          <button type="button" onClick={reset} className="btn-secondary">
            Qaytadan
          </button>
        )}
        <Link href="/" className="btn-ghost">
          Boş sahifa
        </Link>
      </div>
    </div>
  );
}
