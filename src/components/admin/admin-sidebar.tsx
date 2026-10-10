"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavLink } from "@/components/nav-menu";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PowerIcon } from "@/components/icons";

/** Admin panel chap paneli (kompyuterda). */
export function AdminSidebar({ nav }: { nav: NavLink[] }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-white/10 bg-[#08080d]/95 backdrop-blur-xl lg:flex">
      <Link href="/sardorxon/admin" className="px-5 py-4 font-semibold">
        tayyorr<span className="text-indigo-400">.uz</span>{" "}
        <span className="text-zinc-500">admin</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
        {nav.map((l) => {
          const active =
            l.href === "/sardorxon/admin"
              ? pathname === l.href
              : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`backdrop-blur-sm flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-indigo-500/15 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base">{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              {!!l.badge && l.badge > 0 && (
                <span className="rounded-full bg-indigo-500 px-1.5 text-xs font-semibold text-white">
                  {l.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-white/10 p-3">
        <ThemeToggle />
        <AdminPostButton
          url="/api/admin/logout"
          label={<span className="inline-flex items-center gap-2"><PowerIcon /> Chiqish</span>}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          redirectTo="/sardorxon/admin/login"
        />
      </div>
    </aside>
  );
}
