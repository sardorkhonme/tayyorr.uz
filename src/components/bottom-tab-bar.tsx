"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";
import { useUnread } from "@/components/unread-provider";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  avatar?: boolean;
}

/**
 * Telefon va planşetda (lg dan kichik) — mobil ilovadagi pastki panel:
 * suzib turuvçi kapsula, tanlangan bölim — ikonka + töliq nomli tabletka
 * (boşqalari faqat ikonka). Profil — foydalanuvçi rasmi.
 *  - tayyorlovçi: Asosiy · Takliflarim · Xabarlar · Hamyon · Profil
 *  - buyurtmaçi:  Asosiy · Buyurtmalarim · Xabarlar · Hamyon · Profil
 * Kompyuterda yöq (çapda sidebar).
 */
export function BottomTabBar({
  role,
  unread = 0,
  image,
  name,
}: {
  role: string | null;
  unread?: number;
  image: string | null;
  name: string;
}) {
  const pathname = usePathname();
  const live = useUnread();
  // chat ichida — töliq ekran (yoziş maydoni pastda)
  if (/^\/messages\/[^/]+$/.test(pathname)) return null;

  const unreadCount = live ? live.total : unread;
  const isPreparer = role === "PREPARER";
  const tabs: Tab[] = [
    { href: "/dashboard", label: "Asosiy", icon: "home" },
    isPreparer
      ? { href: "/offers", label: "Takliflarim", icon: "hand" }
      : { href: "/orders", label: "Buyurtmalarim", icon: "file" },
    { href: "/messages", label: "Xabarlar", icon: "message", badge: unreadCount },
    { href: "/wallet", label: "Hamyon", icon: "wallet" },
    { href: "/profile", label: "Profil", icon: "user", avatar: true },
  ];
  const activeIdx = tabs.findIndex(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/"),
  );
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <>
      {/* kontent panel ostida qolmasin */}
      <div aria-hidden className="h-24 lg:hidden" />
      <nav
        aria-label="Asosiy bölimlar"
        className="fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
        style={{ paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 2px))" }}
      >
        <div className="mx-auto flex h-[68px] w-full max-w-xl items-stretch rounded-[28px] border border-white/10 bg-[var(--surface)] p-[7px] shadow-2xl shadow-black/30">
          {tabs.map((t, i) => {
            const active = i === activeIdx;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className={`tab-item relative flex min-w-0 items-center justify-center gap-2 overflow-hidden rounded-[21px] px-2 transition-[flex-grow,background-color,color] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
                  active
                    ? "tab-active bg-indigo-500/15 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={{ flexGrow: active ? 30 : 10, flexBasis: 0 }}
              >
                <span className="relative shrink-0">
                  {t.avatar ? (
                    <span
                      className={`block h-[26px] w-[26px] overflow-hidden rounded-full ${
                        active ? "ring-2 ring-indigo-400" : "ring-1 ring-zinc-500/40"
                      }`}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span
                          className="flex h-full w-full items-center justify-center text-xs font-extrabold"
                          style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", color: "#fff" }}
                        >
                          {initial}
                        </span>
                      )}
                    </span>
                  ) : (
                    <Icon name={t.icon} className="h-[22px] w-[22px]" />
                  )}
                  {!!t.badge && t.badge > 0 && (
                    <span
                      className="absolute -right-[9px] -top-[6px] min-w-[18px] rounded-full border-2 border-[var(--surface)] bg-rose-500 px-[5px] text-center text-[10px] font-extrabold leading-[14px]"
                      style={{ color: "#fff" }}
                    >
                      {t.badge > 99 ? "99+" : t.badge}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="tab-label min-w-0 truncate text-[13.5px] font-bold tracking-tight">
                    {t.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
