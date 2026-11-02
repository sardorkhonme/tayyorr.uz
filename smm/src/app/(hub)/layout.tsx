import { currentUser } from "@/auth";
import { HubMobileBar, HubSidebar, type HubUser } from "@/components/hub-nav";

/** tayyorr+ kabineti: chapda panel (kompyuter), tepada popup menyu (telefon). */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
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
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
