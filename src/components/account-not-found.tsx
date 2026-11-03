"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icons";

export function AccountNotFound() {
  const [busy, setBusy] = useState(false);

  async function handleRetry() {
    setBusy(true);
    // Eski/o'chirilgan hisob sessiyasini tozalab, login sahifasiga yo'naltiramiz
    window.location.href = "/api/sso/logout";
  }

  return (
    <AuthShell width="max-w-md">
      <div className="card p-7 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
          <Icon name="user" className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-semibold text-white">
          Bunday hisob mavjud emas
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sizning hisobingiz tizimdan öçirilgan yoki topilmadi. Qaytadan kiriş
          uçun quyidagi tugmani bosing.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleRetry}
            disabled={busy}
            className="btn-primary w-full justify-center"
          >
            {busy ? "Yo'naltirilmoqda..." : "Qayta uriniş"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

