import { redirect } from "next/navigation";

import { saveAccountAction } from "@/app/account/actions";
import { AccountEditor } from "@/components/account-editor";
import { SignOutLink } from "@/components/sign-out-link";
import { SendSoundToggle } from "@/components/send-sound-toggle";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getAccount } from "@/lib/account";
import { loginUrl, PLUS_URL, sessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akkaunt" };

/** Akkaunt — tayyorr hisobi (barcha platformalarda bir xil), shu yerda ham tahrirlanadi. */
export default async function AccountPage() {
  const userId = await sessionUserId();
  if (!userId) redirect(await loginUrl("/account"));
  const account = await getAccount(userId);
  if (!account) redirect(await loginUrl("/account"));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-zinc-900">Akkaunt</h1>
        <p className="mt-2 text-zinc-500">Bitta tayyorr hisobi — özgarişlar barça platformalarda bir xil körinadi.</p>
      </header>

      <AccountEditor initial={account} save={saveAccountAction} />

      <section className="card flex flex-col gap-4 !rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900">Köriniş</h2>
          <p className="mt-1 text-sm text-zinc-500">Yoruğ yoki qoronği mavzu — Tayyorr SMM, tayyorr+ va Tayyorr.uz da bir xil.</p>
        </div>
        <ThemeSwitcher />
      </section>

      <section className="card flex flex-col gap-4 !rounded-3xl p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900">Sozlamalar</h2>
          <p className="mt-1 text-sm text-zinc-500">Tayyorr SMM, tayyorr+ va Tayyorr.uz da bir xil.</p>
        </div>
        <SendSoundToggle />
      </section>

      <SignOutLink
        href={`${PLUS_URL}/logout`}
        name={account.firstName || null}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
      />
    </div>
  );
}
