"use client";

import { useTransition } from "react";

import { signOutToLoginAction } from "@/app/(hub)/actions";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

/**
 * Brauzerda sessiya bor, lekin hisob bazada yo'q (admin o'chirgan) —
 * tayyorr.uz dagidek: xabar + sessiyani tozalab kirish sahifasiga.
 */
export function AccountNotFound() {
  const [pending, start] = useTransition();
  return (
    <main className="hero-bg grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <Logo className="text-3xl" />
        <div className="card mt-8 !rounded-3xl p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500">
            <Icon name="user-x" className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-zinc-900">Bunday hisob mavjud emas</h1>
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
