"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { HubUser } from "@/components/hub-nav";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { SUPPORT_UNREAD_EVENT } from "@/components/support-widget";

/**
 * Telefon va planşet (<1024px) — Flutter ilovadagi tayyorr+ qobiği bilan bir xil:
 *  · tepada header yöq (faqat ički sahifalarda — «orqaga» va logo);
 *  · pastda suzuvçi panel: Boş sahifa, Hamyon, Xabarlar (Support), Qöllanma, Profil.
 * Kompyuterda — çapdagi panel (hub-nav.tsx → HubSidebar).
 */

type Tab = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

const TABS: Tab[] = [
  { href: "/", label: "Boş sahifa", icon: "home", match: (p) => p === "/" },
  { href: "/wallet", label: "Hamyon", icon: "wallet", match: (p) => p.startsWith("/wallet") },
  { href: "/support", label: "Xabarlar", icon: "message", match: (p) => p.startsWith("/support") },
  { href: "/qollanma", label: "Qöllanma", icon: "book", match: (p) => p.startsWith("/qollanma") },
  { href: "/account", label: "Profil", icon: "user", match: (p) => p.startsWith("/account") },
];

/** Butun ekranli sahifalar (support çati) — header va panel körinmaydi (çatning özida yopiş tugmasi bor). */
export function hideShell(pathname: string) {
  return pathname === "/support";
}

/** Ički sahifa (masalan çek) — headerda «orqaga». */
function backTarget(pathname: string): string | null {
  if (/^\/wallet\/[^/]+/.test(pathname)) return "/wallet";
  return null;
}

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  if (hideShell(pathname)) return null;
  const back = backTarget(pathname);
  // tayyorr+ da tepada header yöq (faqat ički sahifalarda «orqaga») — soat qatori uçun joy qoladi
  if (!back) return <div aria-hidden className="h-[max(0.75rem,env(safe-area-inset-top))] lg:hidden" />;
  return (
    <div className="m-header-fade sticky top-0 z-40 px-3 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
      <div className="flex h-14 items-center gap-2">
        {back && (
          <button
            type="button"
            aria-label="Orqaga"
            onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}
            className="glass grid h-12 w-12 shrink-0 place-items-center rounded-full text-zinc-900 transition active:scale-95"
          >
            <Icon name="arrow-left" className="h-5 w-5" strokeWidth={2.2} />
          </button>
        )}
        <Link href="/" className="glass flex h-12 min-w-0 flex-1 items-center justify-center rounded-full px-4 transition active:scale-[0.98]">
          <Logo className="whitespace-nowrap text-[19px]" markClassName="h-7" />
        </Link>
      </div>
    </div>
  );
}

function Avatar({ user, active }: { user: NonNullable<HubUser>; active: boolean }) {
  const ring = active ? "ring-2 ring-white" : "ring-1 ring-white/30";
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.image} alt="" className={`h-[26px] w-[26px] shrink-0 rounded-full object-cover ${ring}`} />
  ) : (
    <span
      className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] text-[12px] font-extrabold text-white ${ring}`}
    >
      {user.name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/** Pastki suzuvçi panel — tanlangan bölim kengayib nomi bilan körinadi (ilovadagi GradientBottomBar). */
export function MobileTabBar({ user }: { user: HubUser }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const on = (e: Event) => setUnread(Number((e as CustomEvent<number>).detail) || 0);
    window.addEventListener(SUPPORT_UNREAD_EVENT, on);
    return () => window.removeEventListener(SUPPORT_UNREAD_EVENT, on);
  }, []);

  if (hideShell(pathname)) return null;
  return (
    <nav
      aria-label="Bölimlar"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="glass mx-auto flex h-[68px] max-w-xl items-stretch rounded-[28px] p-[7px]">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const profile = t.href === "/account" && user;
          const badge = t.href === "/support" ? unread : 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              aria-label={t.label}
              style={{ flexGrow: active ? 3 : 1 }}
              className={`flex min-w-0 basis-0 items-center justify-center rounded-[21px] px-2 transition-[flex-grow,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                active ? "tab-pill text-[var(--tab-active)]" : "text-[var(--tab-idle)]"
              }`}
            >
              <span className="relative shrink-0">
                {profile ? (
                  <Avatar user={user} active={active} />
                ) : (
                  <Icon name={t.icon} className="h-[22px] w-[22px]" strokeWidth={active ? 2.1 : 1.8} />
                )}
                {badge > 0 && (
                  <span className="absolute -right-[9px] -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-[var(--surface)] bg-[#f43f5e] px-1 text-[10px] font-extrabold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap text-[13.5px] font-bold tracking-[-0.01em] transition-[max-width,opacity,padding] duration-500 ${
                  active ? "max-w-[8rem] pl-2 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
