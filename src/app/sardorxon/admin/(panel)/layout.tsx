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
  { href: "/sardorxon/admin", label: "Bosh", icon: "home" },
  { href: "/sardorxon/admin/orders", label: "Buyurtmalar", icon: "package" },
  { href: "/sardorxon/admin/messages", label: "Xabarlar", icon: "message" },
  { href: "/sardorxon/admin/broadcast", label: "Ommaviy xabar", icon: "megaphone" },
  { href: "/sardorxon/admin/announcement", label: "E'lon banneri", icon: "pin" },
  { href: "/sardorxon/admin/payments", label: "To'lovlar", icon: "card" },
  { href: "/sardorxon/admin/payouts", label: "Yechib olish", icon: "banknote" },
  { href: "/sardorxon/admin/complaints", label: "Shikoyatlar", icon: "alert" },
  { href: "/sardorxon/admin/users", label: "Foydalanuvchilar", icon: "users" },
  { href: "/sardorxon/admin/sources", label: "Qayerdan eshitgan", icon: "chart" },
  { href: "/sardorxon/admin/chats", label: "Suhbatlar", icon: "messages" },
  { href: "/sardorxon/admin/referrals", label: "Tashriflar", icon: "link" },
  { href: "/sardorxon/admin/landing", label: "Sayt kontenti", icon: "film" },
  { href: "/sardorxon/admin/app", label: "Mobil ilova", icon: "phone" },
  { href: "/sardorxon/admin/smm", label: "tayyorr+", icon: "rocket" },
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
    "/sardorxon/admin/messages": unreadMsgs,
    "/sardorxon/admin/complaints": openComplaints,
    "/sardorxon/admin/payouts": pendingPayouts,
  };
  const nav: NavLink[] = BASE.map((l) => ({ ...l, badge: badge[l.href] }));

  return (
    <div className="min-h-screen bg-[#08080d] text-zinc-100">
      <RevealOnScroll />
      <AdminSidebar nav={nav} />

      {/* mobil header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08080d]/85 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/sardorxon/admin" className="shrink-0 font-semibold">
            tayyorr<span className="text-indigo-400">.uz</span>{" "}
            <span className="text-zinc-500">admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <AdminPostButton
              url="/api/admin/logout"
              label="Chiqish"
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:text-red-400"
              redirectTo="/sardorxon/admin/login"
            />
            <NavMenu links={nav} footer={<ThemeToggle bare />} />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:pl-[15.5rem] lg:pr-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
