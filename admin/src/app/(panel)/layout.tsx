import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";
import { getMaintenance } from "@/lib/maintenance";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { NavMenu, type NavLink } from "@/components/nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { AdminBrand } from "@/components/admin/admin-brand";

const BASE: NavLink[] = [
  { href: "/", label: "Boş", icon: "home" },
  { href: "/stats", label: "Statistika", icon: "chart" },
  { href: "/logs", label: "Loglar", icon: "clock" },
  { href: "/maintenance", label: "Texnik işlar", icon: "alert" },
  { href: "/orders", label: "Buyurtmalar", icon: "package" },
  { href: "/messages", label: "Xabarlar", icon: "message" },
  { href: "/broadcast", label: "Ommaviy xabar", icon: "megaphone" },
  { href: "/announcement", label: "Eʼlon banneri", icon: "pin" },
  { href: "/payments", label: "Tölovlar", icon: "card" },
  { href: "/payouts", label: "Yeçib oliş", icon: "banknote" },
  { href: "/complaints", label: "Şikoyatlar", icon: "alert" },
  { href: "/users", label: "Foydalanuvçilar", icon: "users" },
  { href: "/sources", label: "Qayerdan eşitgan", icon: "chart" },
  { href: "/chats", label: "Suhbatlar", icon: "messages" },
  { href: "/referrals", label: "Taşriflar", icon: "link" },
  { href: "/landing", label: "Sayt kontenti", icon: "film" },
  { href: "/app", label: "Mobil ilova", icon: "phone" },
  { href: "/smm", label: "tayyorr+", icon: "rocket", image: "/plus-mark.png" },
  { href: "/smm-services", label: "SMM xizmatlari", icon: "rocket", image: "/smm-mark.png" },
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
  const [unreadMsgs, openComplaints, pendingPayouts, maintenance] = await Promise.all([
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
    getMaintenance(),
  ]);

  const badge: Record<string, number> = {
    "/messages": unreadMsgs,
    "/complaints": openComplaints,
    "/payouts": pendingPayouts,
    "/maintenance": maintenance.on ? 1 : 0,
  };
  const nav: NavLink[] = BASE.map((l) => ({ ...l, badge: badge[l.href] }));

  return (
    <div className="min-h-screen bg-[#08080d] text-zinc-100">
      <RevealOnScroll />
      <AdminSidebar nav={nav} />

      {/* mobil header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08080d]/85 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="shrink-0">
            <AdminBrand />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <AdminPostButton
              url="/api/admin/logout"
              label="Çiqiş"
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:text-red-400"
              redirectTo="/login"
            />
            <NavMenu links={nav} footer={<ThemeToggle bare />} />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:pl-[15.5rem] lg:pr-8">
        <div className="mx-auto max-w-5xl has-[[data-wide]]:max-w-none">
          {/* texnik ishlar yoqilgan — o'chirishni unutmaslik uchun har sahifada */}
          {maintenance.on && (
            <Link
              href="/maintenance"
              className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-amber-300 transition hover:bg-orange-500/15"
            >
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-orange-400" />
              <span className="min-w-0 flex-1">
                <b>Texnik işlar rejimi yoqilgan</b> — saytlar faqat ruxsat berilgan {maintenance.allow.length} ta foydalanuvçiga oçiq.
              </span>
              <span className="shrink-0 font-semibold">Boşqariş →</span>
            </Link>
          )}
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
                { href: process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz", label: "Tayyorr.uz" },
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
