"use client";

import { useTransition } from "react";

import { signOutToLoginAction } from "@/app/(hub)/actions";
import { Mascot } from "@/components/mascot";
import { Logo } from "@/components/logo";

/**
 * Brauzerda sessiya bor, lekin hisob bazada yo'q (admin o'chirgan) —
 * tayyorr.uz dagidek: xabar + sessiyani tozalab kirish sahifasiga.
 */
export function AccountNotFound() {
  const [pending, start] = useTransition();
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <Logo className="text-3xl" />
        <div className="mt-6">
          <Mascot pose="not-found" size={260} priority className="mx-auto" />
          <h1 className="mt-2 font-display text-2xl font-bold text-zinc-900">Bunday hisob mavjud emas</h1>
          <p className="mt-2 leading-relaxed text-zinc-500">
            Hisobingiz tizimdan öçirilgan yoki topilmadi. Qaytadan kiriş yoki röyxatdan ötiş
            uçun quyidagi tugmani bosing.
          </p>
          <button
            type="button"
            onClick={() => start(() => signOutToLoginAction())}
            disabled={pending}
            className="btn-primary mt-7 w-full !py-4 !text-base"
          >
            {pending ? "Yönaltirilmoqda…" : "Qayta uriniş"}
          </button>
        </div>
      </div>
    </main>
  );
}
