"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Logo } from "@/components/logo";
import { canGoBack } from "@/components/nav-history";
import { PLUS_URL } from "@/lib/site";
import {
  BackChevron,
  HEADER_CAPSULE,
  HeaderIconGroup,
  HeaderSearchBar,
  useHeaderConfigValue,
  useHeaderSearch,
} from "@/components/page-header";

/** Pastki paneldagi bölimlar — ularda çapda tayyorr+ tugmasi, ički sahifalarda «orqaga». */
const TAB_ROOTS = ["/dashboard", "/offers", "/orders", "/messages", "/wallet", "/profile"];

/**
 * Telefon va planşetda (lg dan kichik) — mobil ilovadagi kabi tepada suzib
 * turuvçi header: çapda tayyorr+ (yoki orqaga) va Tayyorr.uz logosi
 * kapsulalari, öngda sahifaning ikonkalar guruhi (qidiruv, filtr, «+»,
 * qöllanma...). Qidiruv bosilsa — butun qator qidiruv maydoniga aylanadi.
 * Kompyuterda header yöq (çapda sidebar, qidiruv sahifaning özida).
 */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const config = useHeaderConfigValue();
  const { open: searchOpen } = useHeaderSearch();
  // chat ichida header ChatRoom bilan birlashadi — bu yerda ko'rsatmaymiz
  if (/^\/messages\/[^/]+$/.test(pathname)) return null;

  const searching = !!(searchOpen && config?.search);
  const atRoot = TAB_ROOTS.includes(pathname);

  return (
    <header className="sticky top-0 z-30 lg:hidden">
      {/* soat/batareya qatori ostidagi soya — kontent header ortida xira körinadi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+12px)]"
        style={{
          background:
            "linear-gradient(to bottom, var(--bg) 0%, color-mix(in srgb, var(--bg) 85%, transparent) 60%, transparent 100%)",
        }}
      />
      <div
        className="relative mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:px-5"
        style={{ marginTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        {searching && config ? (
          <HeaderSearchBar config={config} />
        ) : (
          <>
            {atRoot ? (
              <a
                href={PLUS_URL}
                aria-label="tayyorr+"
                className={`flex h-12 shrink-0 items-center gap-1 rounded-full pl-3 pr-3.5 text-zinc-200 transition active:scale-95 ${HEADER_CAPSULE}`}
              >
                <BackChevron className="h-[17px] w-[17px]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/plus-mark.png" alt="" className="h-6 w-6 object-contain" draggable={false} />
              </a>
            ) : (
              <button
                type="button"
                aria-label="Orqaga"
                onClick={() => (canGoBack() ? router.back() : router.push("/dashboard"))}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-200 transition active:scale-95 ${HEADER_CAPSULE}`}
              >
                <BackChevron className="h-[19px] w-[19px]" />
              </button>
            )}
            <Link
              href="/dashboard"
              aria-label="Tayyorr.uz — asosiy"
              className={`flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-full px-4 transition active:scale-[0.98] ${HEADER_CAPSULE}`}
            >
              <Logo className="text-[17px]" markClassName="h-6" />
            </Link>
            {/* kapsulalar orasidagi masofa hamişa 8px (gap-2); logo kapsulasi qolgan joyni egallaydi */}
            {config && <HeaderIconGroup config={config} />}
          </>
        )}
      </div>
    </header>
  );
}
