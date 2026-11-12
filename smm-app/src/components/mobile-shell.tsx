"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";
import type { HeaderUser } from "@/components/smm-header";

const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

/**
 * Telefon va planşet (<1024px) — Flutter ilovadagi Tayyorr SMM qobiği bilan bir xil:
 *  · tepada suzuvçi şişa header: çapda tayyorr+ ga qaytiş (‹ belgisi), xizmat logosi, öngda sahifa ikonkalari;
 *  · pastda suzuvçi panel: Xizmatlar, Çegirmalar, Buyurtmalar, Hamyon, Profil.
 * Kompyuterda — odatdagi header (smm-header.tsx).
 */

type Tab = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

const TABS: Tab[] = [
  { href: "/", label: "Xizmatlar", icon: "grid", match: (p) => p === "/" },
  { href: "/chegirmalar", label: "Çegirmalar", icon: "tag", match: (p) => p.startsWith("/chegirmalar") },
  { href: "/orders", label: "Buyurtmalar", icon: "package", match: (p) => p.startsWith("/orders") },
  { href: "/wallet", label: "Hamyon", icon: "wallet", match: (p) => p.startsWith("/wallet") },
  { href: "/account", label: "Profil", icon: "user", match: (p) => p.startsWith("/account") },
];

type Action = { href: string; label: string; icon: IconName };
const GUIDE: Action = { href: "/qollanma", label: "Qöllanma", icon: "book" };
const HELP: Action = { href: "/support", label: "Yordam", icon: "headset" };

/** Sahifaga xos header ikonkalari: Xizmatlar va Çegirmalar — qöllanma, Profil — yordam. */
function actionsFor(pathname: string): Action[] {
  if (pathname === "/" || pathname === "/chegirmalar") return [GUIDE];
  if (pathname === "/account") return [HELP];
  return [];
}

/** Pastki paneldagi bölim emas, ički sahifa — headerda «orqaga» (ilovada ham alohida oçiladi). */
function backTarget(pathname: string): string | null {
  if (pathname === "/qollanma") return "/";
  if (/^\/orders\/[^/]+/.test(pathname)) return "/orders";
  if (/^\/wallet\/[^/]+/.test(pathname)) return "/wallet";
  return null;
}

/** Butun ekranli sahifalar (support çati) — header va panel körinmaydi. */
export function hideShell(pathname: string) {
  return pathname === "/support";
}

function HeaderIconGroup({ items }: { items: Action[] }) {
  if (!items.length) return null;
  return (
    <div className="glass flex h-12 shrink-0 items-center rounded-full">
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center">
          {i > 0 && <span aria-hidden className="h-5 w-px bg-zinc-300/60" />}
          <Link
            href={it.href}
            title={it.label}
            aria-label={it.label}
            className={`grid h-12 place-items-center text-zinc-800 transition active:scale-95 ${
              i === 0 || i === items.length - 1 ? "w-[50px]" : "w-[46px]"
            }`}
          >
            <Icon name={it.icon} className="h-[21px] w-[21px]" />
          </Link>
        </span>
      ))}
    </div>
  );
}

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  if (hideShell(pathname)) return null;
  const back = backTarget(pathname);
  const actions = actionsFor(pathname);

  return (
    <div className="m-header-fade sticky top-0 z-40 px-3 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
      <div className="flex h-14 items-center gap-2">
        {back ? (
          <button
            type="button"
            aria-label="Orqaga"
            onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}
            className="glass grid h-12 w-12 shrink-0 place-items-center rounded-full text-zinc-900 transition active:scale-95"
          >
            <Icon name="arrow-left" className="h-5 w-5" strokeWidth={2.2} />
          </button>
        ) : (
          <a
            href={PLUS_URL}
            aria-label="tayyorr+"
            title="tayyorr+ ga qaytiş"
            className="glass flex h-12 shrink-0 items-center gap-1 rounded-full pl-3 pr-3.5 text-zinc-900 transition active:scale-95"
          >
            <Icon name="arrow-left" className="h-[17px] w-[17px]" strokeWidth={2.2} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/plus-mark.png" alt="" className="h-6 w-6 object-contain" />
          </a>
        )}
        <Link
          href="/"
          className="glass flex h-12 min-w-0 flex-1 items-center justify-center gap-[7px] rounded-full px-4 transition active:scale-[0.98]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smm-mark.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
          <span className="truncate font-display text-[19px] font-bold tracking-tight text-zinc-900">
            Tayyorr <span className="text-fuchsia-500">SMM</span>
          </span>
        </Link>
        <HeaderIconGroup items={actions} />
      </div>
    </div>
  );
}

function Avatar({ user, active }: { user: NonNullable<HeaderUser>; active: boolean }) {
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
export function MobileTabBar({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  if (hideShell(pathname)) return null;
  return (
    <nav
      aria-label="Bölimlar"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="glass mx-auto flex h-[68px] max-w-xl items-stretch gap-0 rounded-[28px] p-[7px]">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const profile = t.href === "/account" && user;
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
              {profile ? <Avatar user={user} active={active} /> : <Icon name={t.icon} className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.1 : 1.8} />}
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
