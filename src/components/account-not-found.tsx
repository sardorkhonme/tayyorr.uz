"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AuthShell } from "@/components/auth-shell";

export function AccountNotFound() {
  const [busy, setBusy] = useState(false);

  async function handleRetry() {
    setBusy(true);
    // Eski/o'chirilgan hisob sessiyasini tozalab, login sahifasiga yo'naltiramiz
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <AuthShell width="max-w-md">
      <div className="card p-7 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-3xl text-red-400">
          👤
        </div>
        <h1 className="text-xl font-semibold text-white">
          Bunday hisob mavjud emas
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sizning hisobingiz tizimdan o'chirilgan yoki topilmadi. Qaytadan kirish
          uchun quyidagi tugmani bosing.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleRetry}
            disabled={busy}
            className="btn-primary w-full justify-center"
          >
            {busy ? "Yo'naltirilmoqda..." : "Qayta urinish"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

