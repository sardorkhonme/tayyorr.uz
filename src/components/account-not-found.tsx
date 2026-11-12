"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Mascot } from "@/components/mascot";

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
        <Mascot pose="not-found" size={140} priority className="mx-auto mb-3" />
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
            {busy ? "Yönaltirilmoqda..." : "Qayta uriniş"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

