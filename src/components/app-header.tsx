"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavMenu } from "@/components/nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { navForRole } from "@/lib/nav";
import { useUnread } from "@/components/unread-provider";
import { StarIcon } from "@/components/icons";
import { TayyorrPlusCard } from "@/components/tayyorr-plus-card";
import {
  HeaderIconGroup,
  HeaderSearchBar,
  useHeaderConfigValue,
  useHeaderSearch,
} from "@/components/page-header";

/**
 * Yuqori panel. Telefonda: logo + sahifa ikonkalari + avatar + menyu.
 * Kompyuterda (chapda sidebar bor): faqat sahifa sarlavhasi va ikonkalari —
 * sahifada ikonka bo'lmasa panel umuman ko'rinmaydi.
 */
export function AppHeader({
  image,
  unread = 0,
  starBalance = null,
  role = null,
}: {
  image: string | null;
  unread?: number;
  /** null bo'lsa (masalan buyurtma beruvchi) qator umuman ko'rsatilmaydi. */
  starBalance?: number | null;
  role?: string | null;
}) {
  const pathname = usePathname();
  const live = useUnread();
  const config = useHeaderConfigValue();
  const { open: searchOpen } = useHeaderSearch();
  // chat ichida header ChatRoom bilan birlashadi — bu yerda ko'rsatmaymiz
  if (/^\/messages\/[^/]+$/.test(pathname)) return null;

  const unreadCount = live ? live.total : unread;
  const nav = navForRole(role).map((l) =>
    l.href === "/messages" ? { ...l, badge: unreadCount } : l,
  );
  const searching = !!(searchOpen && config?.search);
  const hasDesktopBar = !!(
    config &&
    (config.search || config.filter || config.actions?.length)
  );

  return (
    <header
      className={`sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4 lg:pl-[17rem] lg:pr-6 ${
        hasDesktopBar ? "" : "lg:hidden"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 rounded-2xl border border-white/10 bg-[var(--surface)] px-3 shadow-lg shadow-black/10 sm:px-4">
        {searching && config ? (
          <HeaderSearchBar config={config} />
        ) : (
          <>
            <Link href="/dashboard" className="shrink-0 lg:hidden">
              <Logo className="text-xl sm:text-2xl" markClassName="h-8 sm:h-9" />
            </Link>
            {config?.title && (
              <h1 className="hidden min-w-0 truncate text-base font-semibold text-white lg:block">
                {config.title}
              </h1>
            )}
            <div className="ml-auto flex items-center gap-2">
              {config && <HeaderIconGroup config={config} />}
              <Link
                href="/profile"
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5 transition hover:border-white/30 lg:hidden"
                aria-label="Profil"
              >
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="lg:hidden">
                <NavMenu
                  links={nav}
                  footer={
                    <div className="space-y-1.5">
                      <TayyorrPlusCard compact />
                      <ThemeToggle bare />
                    </div>
                  }
                  topSlot={
                    starBalance !== null ? (
                      <Link
                        href="/wallet"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-amber-300 transition hover:bg-white/5"
                      >
                        <StarIcon className="h-[18px] w-[18px]" />
                        <span className="flex-1">Stars</span>
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          {starBalance}
                        </span>
                      </Link>
                    ) : null
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
