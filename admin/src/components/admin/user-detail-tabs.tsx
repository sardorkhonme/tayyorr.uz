"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function tabs(id: string) {
  const base = `/users/${id}`;
  return [
    { href: base, label: "Umumiy" },
    { href: `${base}/cheklov`, label: "Cheklov" },
    { href: `${base}/telegram`, label: "Telegram" },
    { href: `${base}/qurilmalar`, label: "Qurilmalar" },
    { href: `${base}/kirishlar`, label: "Kirishlar" },
    { href: `${base}/referallar`, label: "Referallar" },
    { href: `${base}/hamyon`, label: "Hamyon" },
    { href: `${base}/xabar`, label: "Xabar yuborish" },
    { href: `${base}/suhbatlar`, label: "Suhbatlar" },
    { href: `${base}/jurnal`, label: "Jurnal" },
    { href: `${base}/xavfli`, label: "Xavfli zona", danger: true },
  ];
}

/** Foydalanuvchi profili sahifalari orasidagi tab-panel (sticky, gorizontal scroll). */
export function UserDetailTabs({ userId }: { userId: string }) {
  const pathname = usePathname();
  const base = `/users/${userId}`;
  const list = tabs(userId);

  return (
    <div className="sticky top-0 z-20 overflow-x-auto border-b border-white/10 bg-[#08080d]/90 backdrop-blur-xl">
      <div className="flex min-w-max gap-1 py-2">
        {list.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
                active
                  ? t.danger
                    ? "bg-red-500/15 text-red-200"
                    : "bg-indigo-500/15 text-white"
                  : t.danger
                    ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-300"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
