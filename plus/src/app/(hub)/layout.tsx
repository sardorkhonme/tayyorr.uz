import { redirect } from "next/navigation";

import { auth, currentUser } from "@/auth";
import { AccountNotFound } from "@/components/account-not-found";
import { HubMobileBar, HubSidebar, type HubUser } from "@/components/hub-nav";
import { PushPrompt } from "@/components/push-prompt";
import { SiteFooter } from "@/components/site-footer";
import { SupportWidget } from "@/components/support-widget";

/** tayyorr+ kabineti: chapda panel (kompyuter), tepada popup menyu (telefon). */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const [session, u] = await Promise.all([auth(), currentUser()]);
  // brauzerda sessiya qolgan, lekin hisob o'chirilgan — tayyorr.uz dagidek xabar
  if (session?.user?.id && !u) return <AccountNotFound />;
  // profili to'liq bo'lmagan (Google orqali yangi kirgan) — avval ro'yxatdan o'tishni yakunlasin
  if (u && !u.login) redirect("/onboarding");
  const user: HubUser = u
    ? {
        name: u.firstName || u.name || (u.login ? `@${u.login}` : "Foydalanuvchi"),
        image: u.avatarUrl || u.image,
        balance: u.balance,
        walletCode: u.walletCode,
      }
    : null;

  return (
    <div className="min-h-dvh">
      <HubSidebar user={user} />
      <HubMobileBar user={user} />
      <main className="px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:pl-[18.5rem] lg:pr-8 lg:pt-10">
        <div className="mx-auto w-full max-w-5xl">
          {children}
          <SiteFooter />
        </div>
      </main>
      <SupportWidget loggedIn={!!user} />
      {user && <PushPrompt />}
    </div>
  );
}
