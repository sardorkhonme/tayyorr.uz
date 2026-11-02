import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { NavMenu, type NavLink } from "@/components/nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { RevealOnScroll } from "@/components/reveal-on-scroll";

const BASE: NavLink[] = [
  { href: "/", label: "Bosh", icon: "home" },
  { href: "/orders", label: "Buyurtmalar", icon: "package" },
  { href: "/messages", label: "Xabarlar", icon: "message" },
  { href: "/broadcast", label: "Ommaviy xabar", icon: "megaphone" },
  { href: "/announcement", label: "E'lon banneri", icon: "pin" },
  { href: "/payments", label: "To'lovlar", icon: "card" },
  { href: "/payouts", label: "Yechib olish", icon: "banknote" },
  { href: "/complaints", label: "Shikoyatlar", icon: "alert" },
  { href: "/users", label: "Foydalanuvchilar", icon: "users" },
  { href: "/sources", label: "Qayerdan eshitgan", icon: "chart" },
  { href: "/chats", label: "Suhbatlar", icon: "messages" },
  { href: "/referrals", label: "Tashriflar", icon: "link" },
  { href: "/landing", label: "Sayt kontenti", icon: "film" },
  { href: "/app", label: "Mobil ilova", icon: "phone" },
  { href: "/smm", label: "tayyorr+", icon: "rocket", image: "/plus-mark.png" },
];

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  const supportId = await getSupportUserId();
  const [unreadMsgs, openComplaints, pendingPayouts] = await Promise.all([
    db.conversation.count({
      where: {
        OR: [{ userAId: supportId }, { userBId: supportId }],
        messages: {
          some: { senderId: { not: supportId }, readAt: null },
        },
      },
    }),
    db.complaint.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    db.payoutRequest.count({ where: { status: "PENDING" } }),
  ]);

  const badge: Record<string, number> = {
    "/messages": unreadMsgs,
    "/complaints": openComplaints,
    "/payouts": pendingPayouts,
  };
  const nav: NavLink[] = BASE.map((l) => ({ ...l, badge: badge[l.href] }));

  return (
    <div className="min-h-screen bg-[#08080d] text-zinc-100">
      <RevealOnScroll />
      <AdminSidebar nav={nav} />

      {/* mobil header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08080d]/85 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="shrink-0 font-semibold">
            tayyorr<span className="text-indigo-400">.uz</span>{" "}
            <span className="text-zinc-500">admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <AdminPostButton
              url="/api/admin/logout"
              label="Chiqish"
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:text-red-400"
              redirectTo="/login"
            />
            <NavMenu links={nav} footer={<ThemeToggle bare />} />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:pl-[15.5rem] lg:pr-8">
        <div className="mx-auto max-w-5xl">
          {children}
          {/* ixcham footer — boshqaruv paneli uchun ortiqcha havolalarsiz */}
          <footer className="mt-14 flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="" className="h-5 w-5 object-contain" />
              Tayyorr admin · © {new Date().getFullYear()}
            </span>
            <span className="flex gap-4">
              {[
                { href: process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz", label: "Ilmiy ishlar" },
                { href: process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz", label: "tayyorr+" },
                { href: process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz", label: "Tayyorr SMM" },
              ].map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="transition hover:text-zinc-300">
                  {l.label}
                </a>
              ))}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
