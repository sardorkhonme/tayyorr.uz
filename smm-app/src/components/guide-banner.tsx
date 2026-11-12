"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";

/** Qo'llanma o'qilganini eslab qoladi (shu brauzerda). */
export const GUIDE_READ_KEY = "smm-guide-read";

/** Qo'llanmani ochgan foydalanuvchini "o'qigan" deb belgilaydi. */
export function MarkGuideRead() {
  useEffect(() => {
    try {
      localStorage.setItem(GUIDE_READ_KEY, "1");
    } catch {}
  }, []);
  return null;
}

/**
 * Buyurtma sahifalari tepasida: qo'llanmani o'qimagan foydalanuvchiga "avval qo'llanma" maslahati.
 * Qo'llanma ochilsa yoki "O'qidim" bosilsa — katta banner o'rniga ixcham havola qoladi
 * ([hideWhenRead] — telefon/planşetda headerda qöllanma ikonkasi bor sahifalarda ixcham havola ham yöq;
 * kompyuterda header ikonkasiz — ixcham havola qoladi).
 */
export function GuideBanner({ hideWhenRead = false }: { hideWhenRead?: boolean }) {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(GUIDE_READ_KEY));
    } catch {
      setShow(true);
    }
  }, []);

  if (show === null) return null;
  // o'qigan bo'lsa — qo'llanma havolasi ixcham qatorda doim turadi
  if (!show)
    return (
      <Link
        href="/qollanma"
        className={`group items-center ${hideWhenRead ? "hidden lg:flex" : "flex"} gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 transition hover:border-indigo-200`}
      >
        <Icon name="book" className="h-5 w-5 shrink-0 text-indigo-500" />
        <span className="min-w-0 flex-1">
          Qaysi xizmatni tanlaşni bilmayapsizmi? <b className="text-zinc-900">Qöllanma</b> — kafolat, tezlik va sifat haqida
        </span>
        <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1" />
      </Link>
    );

  function dismiss() {
    try {
      localStorage.setItem(GUIDE_READ_KEY, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div className="animate-rise relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-lg shadow-amber-500/10 sm:p-6">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-4 sm:flex-nowrap sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30 sm:h-12 sm:w-12">
          <Icon name="book" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-zinc-900 sm:text-xl">Qöllanmani öqimasdan buyurtma bermang!</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">
            1 daqiqada öqiladi — qaysi xizmat pulingizni behuda ketkazmasligini bilib oling.
          </p>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <Link href="/qollanma" className="btn-primary flex-1 !py-3 sm:flex-none">
            Qöllanmani öqiş
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <button type="button" onClick={dismiss} className="btn-ghost !py-3 text-sm">
            Öqidim
          </button>
        </div>
      </div>
    </div>
  );
}
