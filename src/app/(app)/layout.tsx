import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureWalletCode } from "@/lib/wallet";
import { AuroraBackground } from "@/components/aurora-background";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { PresencePing } from "@/components/presence-ping";
import { VisitPing } from "@/components/visit-ping";
import { NavHistoryTracker } from "@/components/nav-history";
import { ThemeSync } from "@/components/theme-sync";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { RestrictionBanner } from "@/components/restriction-banner";
import { UnreadProvider } from "@/components/unread-provider";
import { AccountNotFound } from "@/components/account-not-found";
import { getRestriction, restrictionText } from "@/lib/restriction";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.profileComplete) redirect("/onboarding");

  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      firstName: true,
      login: true,
      role: true,
      avatarUrl: true,
      image: true,
      balance: true,
      starBalance: true,
      walletCode: true,
      theme: true,
    },
  });

  if (!u) {
    return <AccountNotFound />;
  }

  const [restriction, unreadMsgs] = await Promise.all([
    getRestriction(session.user.id),
    db.message.count({
      where: {
        senderId: { not: session.user.id },
        readAt: null,
        conversation: {
          OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
          deletedByUsersAt: null,
          hiddenFromUsersAt: null,
        },
      },
    }),
  ]);
  const walletCode = u.walletCode ?? (await ensureWalletCode(session.user.id));

  return (
    <UnreadProvider initialTotal={unreadMsgs}>
      <div className="relative min-h-screen">
        <AuroraBackground compact />

        <AppSidebar
          unread={unreadMsgs}
          user={{
            name: u?.firstName || u?.name || null,
            login: u?.login ?? null,
            role: u?.role ?? null,
            image: u?.avatarUrl ?? u?.image ?? session.user.image ?? null,
            balance: u?.balance ?? 0,
            starBalance: u?.starBalance ?? 0,
            walletCode,
          }}
        />
        <AppHeader
          image={session.user.image ?? null}
          unread={unreadMsgs}
          starBalance={u?.role === "PREPARER" ? (u?.starBalance ?? 0) : null}
          role={u?.role ?? null}
        />
        <PresencePing />
        <VisitPing />
        <NavHistoryTracker />
        <RevealOnScroll />
        <ThemeSync serverTheme={u?.theme ?? null} />

        <main className="relative z-10 px-3 py-6 sm:px-5 sm:py-8 lg:pl-[17rem] lg:pr-6">
          <div className="mx-auto w-full max-w-5xl">
            {restriction && (
              <RestrictionBanner text={restrictionText(restriction)} />
            )}
            {children}
          </div>
        </main>
      </div>
    </UnreadProvider>
  );
}
